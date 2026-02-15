"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Clock,
  CheckCircle,
  Send,
  Building2,
  Linkedin,
  Twitter,
} from "lucide-react"
import { SiteHeader } from "@/components/shared/site-header"
import { SiteFooter } from "@/components/shared/site-footer"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    role: "",
    subject: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/cms/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({ name: "", email: "", organization: "", role: "", subject: "", message: "" })
      } else {
        const data = await response.json()
        setError(data.error || "Failed to submit form")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      details: "support@edchain.io",
      description: "Send us an email anytime",
    },
    {
      icon: Phone,
      title: "Call Us",
      details: "+971 4 123 4567",
      description: "Mon-Fri from 9am to 6pm GST",
    },
    {
      icon: MapPin,
      title: "Visit Us",
      details: "Dubai Internet City",
      description: "Building 12, Dubai, UAE",
    },
    {
      icon: Clock,
      title: "Business Hours",
      details: "Sun-Thu: 9AM - 6PM",
      description: "GST (UTC+4)",
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="container relative">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-6">
              <MessageCircle className="h-4 w-4" />
              Get in Touch
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Let's Start a<span className="text-primary block">Conversation</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Have questions about blockchain credentials? Want to learn more about our platform? We're here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-8 border-b border-border">
        <div className="container max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactInfo.map((info) => (
              <Card key={info.title} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <info.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{info.title}</h3>
                  <p className="text-primary font-medium">{info.details}</p>
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 flex-1">
        <div className="container max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Form */}
            <div>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-2xl">Send Us a Message</CardTitle>
                  <CardDescription>Fill out the form below and we'll get back to you within 24 hours.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isSubmitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                      <p className="text-muted-foreground mb-6">
                        Thank you for reaching out. Our team will get back to you shortly.
                      </p>
                      <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            placeholder="John Smith"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@university.edu"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="bg-background"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="organization">Organization</Label>
                          <Input
                            id="organization"
                            placeholder="University Name"
                            value={formData.organization}
                            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Your Role</Label>
                          <Select
                            value={formData.role}
                            onValueChange={(value) => setFormData({ ...formData, role: value })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="university_admin">University Administrator</SelectItem>
                              <SelectItem value="registrar">Registrar</SelectItem>
                              <SelectItem value="it_director">IT Director</SelectItem>
                              <SelectItem value="hr_employer">HR / Employer</SelectItem>
                              <SelectItem value="student">Student / Graduate</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="What's this about?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="demo">Request a Demo</SelectItem>
                            <SelectItem value="pricing">Pricing Inquiry</SelectItem>
                            <SelectItem value="technical">Technical Support</SelectItem>
                            <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                            <SelectItem value="general">General Question</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          placeholder="Tell us how we can help you..."
                          rows={5}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          className="bg-background resize-none"
                        />
                      </div>

                      {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                          {error}
                        </div>
                      )}

                      <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                        {isSubmitting ? (
                          "Sending..."
                        ) : (
                          <>
                            Send Message
                            <Send className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Info Section */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Why Choose Us?</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Enterprise-Ready</h3>
                      <p className="text-sm text-muted-foreground">
                        Built for institutions of all sizes with enterprise-grade security and scalability.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Proven Results</h3>
                      <p className="text-sm text-muted-foreground">
                        100+ universities trust us with 50K+ degrees issued and verified on blockchain.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">24/7 Support</h3>
                      <p className="text-sm text-muted-foreground">
                        Dedicated support team available around the clock to help with any questions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-4">Schedule a Demo</h3>
                  <p className="text-muted-foreground mb-6">
                    Want to see our platform in action? Book a personalized demo with our team.
                  </p>
                  <Button className="w-full bg-primary hover:bg-primary/90">Book a Demo Call</Button>
                </CardContent>
              </Card>

              <div>
                <h3 className="font-semibold mb-4">Connect With Us</h3>
                <div className="flex gap-4">
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center hover:border-primary/50 transition-colors"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center hover:border-primary/50 transition-colors"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
