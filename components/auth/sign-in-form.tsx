"use client";

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export function SignInForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    const signInResult = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
      callbackUrl: "/"
    })

    setIsLoading(false)

    if (signInResult?.error) {
      return toast({
        title: "Login Failed",
        description: signInResult.error,
        variant: "destructive",
      })
    }

    // Show success message
    toast({
      title: "Login Successful!",
      description: "Welcome back! Redirecting to your workspace...",
      variant: "default",
    })

    // Small delay to show the success message before redirecting
    setTimeout(() => {
      router.push("/")
      router.refresh()
    }, 1000)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email" {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="Enter your password" {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-4">
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading && <div className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <div className="text-center">
            <span className="text-sm text-gray-500">Don't have an account? </span>
            <Button variant="link" className="p-0" asChild>
              <Link href="/auth/register">Register</Link>
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}