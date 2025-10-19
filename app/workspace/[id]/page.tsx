'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { Idea, Message, Task } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Sparkles, ListTodo, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const ideaId = params.id as string;

  const [idea, setIdea] = useState<Idea | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [ideaId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/ideas/${ideaId}`);
      const ideaData = await response.json();

      if (!ideaData || response.status === 404) {
        router.push('/');
        return;
      }

      setIdea(ideaData);

      const messagesResponse = await fetch(`/api/messages?ideaId=${ideaId}`);
      const messagesData = await messagesResponse.json();
      if (messagesData) {
        setMessages(messagesData);
      }

      const tasksResponse = await fetch(`/api/tasks?ideaId=${ideaId}`);
      const tasksData = await tasksResponse.json();
      if (tasksData) {
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Failed to fetch workspace data:', error);
      router.push('/');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setLoading(true);

    try {
      // Save user message
      const saveMessageResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId,
          role: 'user',
          content: userMessage
        }),
      });

      const userMsg = await saveMessageResponse.json();
      if (userMsg) {
        setMessages([...messages, userMsg]);
      }

      // Get AI response
      const aiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId,
          message: userMessage,
          context: idea?.description || '',
        }),
      });

      const data = await aiResponse.json();

      if (data.message) {
        // Save AI response
        const saveAiResponse = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ideaId,
            role: 'assistant',
            content: data.message
          }),
        });

        const assistantMsg = await saveAiResponse.json();
        if (assistantMsg) {
          setMessages(prev => [...prev, assistantMsg]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }

    setLoading(false);
  };

  const generateTasks = async () => {
    if (!idea || generatingTasks) return;

    setGeneratingTasks(true);

    try {
      console.log('Generating tasks for idea:', idea);
      // Request task generation
      const response = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId: idea.id,
          title: idea.title,
          description: idea.description,
        }),
      });

      const data = await response.json();
      console.log('Response from generate-tasks:', data);

      if (data.tasks) {
        // The generate-tasks API already creates tasks in the database
        // Just refresh the tasks from the database
        const tasksResponse = await fetch(`/api/tasks?ideaId=${idea.id}`);
        const tasksData = await tasksResponse.json();
        if (tasksData) {
          setTasks(tasksData);
        }
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
    }

    setGeneratingTasks(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (!idea) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Ideas
            </Button>
          </Link>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{idea.title}</h1>
            <p className="text-slate-600">{idea.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  AI Assistant
                </CardTitle>
                <CardDescription>Chat with AI to refine your idea</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-[400px] overflow-y-auto space-y-4 p-4 bg-slate-50 rounded-lg">
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-500 py-12">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>Start a conversation with your AI assistant</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white text-slate-900 border border-slate-200 shadow-sm rounded-2xl px-4 py-3">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask the AI anything about your idea..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={loading}
                      className="h-12"
                    />
                    <Button onClick={sendMessage} disabled={loading || !inputMessage.trim()} size="lg">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="border-slate-200 shadow-sm sticky top-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-blue-600" />
                    Task Breakdown
                  </CardTitle>
                  {tasks.length === 0 && (
                    <Button
                      onClick={generateTasks}
                      disabled={generatingTasks}
                      size="sm"
                      className="gap-2"
                    >
                      {generatingTasks ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {messages.length > 0 
                    ? "AI-generated task list based on your conversation" 
                    : "AI-generated task list for your project"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <ListTodo className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">
                      {messages.length > 0 
                        ? "Generate a task breakdown based on your chat conversation" 
                        : "Generate a task breakdown to get started"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {tasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 text-sm">{task.title}</h4>
                          </div>
                          <Badge variant="outline" className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-slate-600 ml-8">{task.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
