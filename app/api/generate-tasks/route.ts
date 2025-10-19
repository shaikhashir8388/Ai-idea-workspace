import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { ideaId, title, description } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Fetch chat conversation context
    const messages = await prisma.message.findMany({
      where: { ideaId },
      orderBy: { createdAt: 'asc' }
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Build conversation context for the AI
    let conversationContext = '';
    if (messages.length > 0) {
      conversationContext = '\n\nConversation Context:\n';
      messages.forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }

    // Generate tasks using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a project management AI assistant. Break down the project idea into 5-7 specific, implementation-focused tasks.
          
          IMPORTANT: Use the conversation context to understand what the user has discussed, refined, or clarified about their project. 
          Consider any specific features, technologies, or requirements mentioned in the chat when creating tasks.
          
          Each task must follow this exact format and be part of a JSON array:
          {
            "title": "Short, action-oriented title",
            "description": "Detailed explanation of implementation steps",
            "priority": "high" | "medium" | "low"
          }
          
          Prioritize tasks based on:
          - High: Core functionality, dependencies, foundational work
          - Medium: Important features, integrations
          - Low: Nice-to-have features, optimizations, polish
          
          Example response:
          [
            {
              "title": "Set up database schema",
              "description": "Design and implement database models including user, posts, and comments. Set up relationships and indexes.",
              "priority": "high"
            }
          ]
          
          Return ONLY the JSON array, no additional text.`
        },
        {
          role: 'user',
          content: `Project: ${title}\n\nDescription: ${description}${conversationContext}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    // Clean up the response if it contains markdown code blocks
    const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let tasksArray;
    try {
      tasksArray = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      );
    }

    if (!Array.isArray(tasksArray)) {
      console.error('Invalid response format:', tasksArray);
      return NextResponse.json(
        { error: 'AI response is not an array' },
        { status: 500 }
      );
    }

    try {
      // Delete existing tasks for this idea
      await prisma.task.deleteMany({
        where: {
          ideaId
        }
      });

      // Create new tasks
      const tasks = await prisma.$transaction(
        tasksArray.map((task, index) => 
          prisma.task.create({
            data: {
              ideaId,
              title: task.title || 'Untitled Task',
              description: task.description || '',
              priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority as 'low' | 'medium' | 'high' : 'medium',
              orderIndex: index,
            }
          })
        )
      );

      console.log('Successfully created tasks:', tasks);
      return NextResponse.json({ tasks });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save tasks to database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generate tasks API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
