import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, MessageCircle, ThumbsUp } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Co<span className="text-blue-600">Draft</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Collaborative document editing with real-time voting, commenting, and version control.
            Build better content together.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="outline" size="lg" className="px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-lg">Rich Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Powerful markdown editor with live preview and collaborative editing features.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <ThumbsUp className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-lg">Voting System</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Vote on individual elements to surface the best content and ideas.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MessageCircle className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle className="text-lg">Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Thread discussions on any part of the document with real-time updates.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <CardTitle className="text-lg">Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Real-time presence, live cursors, and collaborative editing for teams.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to collaborate?</CardTitle>
              <CardDescription className="text-lg">
                Join thousands of teams already using CoDraft to create better content together.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth">
                <Button size="lg" className="px-12">
                  Start Writing Together
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}