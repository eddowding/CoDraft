import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Users,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Keyboard,
  Link as LinkIcon,
  Upload,
  Share,
  BarChart3,
  Download,
  Check,
  X,
  Star
} from 'lucide-react'

export default function HomePage() {
  // DocPulse-style homepage
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">CoDraft</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link>
              <Link href="#use-cases" className="text-gray-600 hover:text-gray-900">Use Cases</Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth">
                <Button>Try For Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Transform how you gather <span className="text-blue-600">document feedback</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                The collaborative platform that makes it easy to collect, analyze, and act on feedback from dozens, hundreds, or thousands of stakeholders.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth">
                  <Button size="lg" className="px-8 py-3 text-lg">
                    Convert Your First Document
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  See How It Works
                </Button>
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg p-8 text-white">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold">Interactive Document Voting Demo</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-800 rounded p-4">
                  <p className="text-sm mb-2">Navigate with keyboard shortcuts</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs"><ArrowUp className="w-3 h-3 mr-1" />Up</Badge>
                    <Badge variant="secondary" className="text-xs"><ArrowDown className="w-3 h-3 mr-1" />Down</Badge>
                    <Badge variant="secondary" className="text-xs"><ArrowLeft className="w-3 h-3 mr-1" />Vote</Badge>
                    <Badge variant="secondary" className="text-xs"><ArrowRight className="w-3 h-3 mr-1" />Vote</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Section */}
        <div className="py-16" id="demo">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">See CoDraft in action</h2>
          </div>

          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">City Park Renovation Proposal <span className="text-gray-500 font-normal">(142 participants)</span></CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                  <p className="text-gray-800 mb-3">
                    The proposed renovation will add accessible pathways throughout the park, ensuring all community members can enjoy the space.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center text-green-600 font-medium">
                      <Check className="w-4 h-4 mr-1" /> 87% approve
                    </span>
                    <span className="flex items-center text-red-600">
                      <X className="w-4 h-4 mr-1" /> 13% disapprove
                    </span>
                    <span className="flex items-center text-gray-600">
                      <MessageCircle className="w-4 h-4 mr-1" /> 12 comments
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded relative">
                  <Badge className="absolute top-2 right-2 bg-green-100 text-green-800">High agreement</Badge>
                  <p className="text-gray-800 mb-3">
                    The renovation budget allocates $250,000 for a new playground with equipment suitable for children of all abilities.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center text-green-600 font-medium">
                      <Check className="w-4 h-4 mr-1" /> 92% approve
                    </span>
                    <span className="flex items-center text-red-600">
                      <X className="w-4 h-4 mr-1" /> 8% disapprove
                    </span>
                    <span className="flex items-center text-gray-600">
                      <MessageCircle className="w-4 h-4 mr-1" /> 23 comments
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded relative">
                  <Badge className="absolute top-2 right-2 bg-yellow-100 text-yellow-800">Contested</Badge>
                  <p className="text-gray-800 mb-3">
                    The proposed plan will remove 12 mature trees to accommodate additional parking spaces.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-1" /> 32% approve
                    </span>
                    <span className="flex items-center text-red-600 font-medium">
                      <X className="w-4 h-4 mr-1" /> 68% disapprove
                    </span>
                    <span className="flex items-center text-gray-600">
                      <MessageCircle className="w-4 h-4 mr-1" /> 45 comments
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <Button variant="outline">See full interactive demo</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="py-16" id="features">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, powerful document collaboration</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform any document into an interactive, votable format with just a few clicks.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-none">
              <CardHeader>
                <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-xl">One-Click Conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Instantly transform any document into markdown with votable elements, ready for collaborative review.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-none">
              <CardHeader>
                <Keyboard className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Keyboard Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Efficiently review content using simple up/down/left/right keys to navigate between elements.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-none">
              <CardHeader>
                <ThumbsUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Element-Level Voting</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Approve or disapprove specific elements with simple gestures, creating granular feedback data.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-none">
              <CardHeader>
                <MessageCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Contextual Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Press 'C' to add comments to any element, keeping feedback directly tied to relevant content.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-none">
              <CardHeader>
                <FileText className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Version Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Press 'V' to suggest alternative text for any element, enabling collaborative editing.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-none">
              <CardHeader>
                <LinkIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <CardTitle className="text-xl">Deep Linking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Share links to specific elements for focused discussion and targeted feedback collection.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="py-16 bg-gray-50 -mx-4 px-4" id="use-cases">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful for mass participation</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how organizations are using our platform to transform document-based collaboration.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg text-blue-600">Public Policy</CardTitle>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg text-green-600">Open Source</CardTitle>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg text-purple-600">Education</CardTitle>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg text-orange-600">Community</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Testimonials */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What our users are saying</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Organizations across sectors are transforming their document collaboration with our platform.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">City of Portland</Badge>
                  <Badge variant="secondary">Public Policy Consultation</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <blockquote className="text-gray-600 mb-4">
                  "This platform transformed our public consultation process. We received structured feedback from over 3,000 residents on our climate action plan, with clear visualization of which proposals had broad support and which needed revision."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    SC
                  </div>
                  <div>
                    <div className="font-medium">Sarah Chen</div>
                    <div className="text-sm text-gray-500">Director of Community Engagement</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">OpenTech Foundation</Badge>
                  <Badge variant="secondary">Open Source Documentation</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <blockquote className="text-gray-600 mb-4">
                  "With contributors across the globe, our governance document review was challenging. This platform let us gather precise feedback on each section, clearly highlighting areas of consensus and concern among our diverse community."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                    MR
                  </div>
                  <div>
                    <div className="font-medium">Miguel Rodriguez</div>
                    <div className="text-sm text-gray-500">Community Manager</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Westlake School District</Badge>
                  <Badge variant="secondary">Curriculum Development</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <blockquote className="text-gray-600 mb-4">
                  "Developing our new science curriculum standards involved feedback from hundreds of teachers. This platform made it possible to identify exactly which standards needed refinement and why, streamlining our entire review process."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                    EJ
                  </div>
                  <div>
                    <div className="font-medium">Dr. Emily Johnson</div>
                    <div className="text-sm text-gray-500">Curriculum Director</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <div className="py-16 bg-gray-50 -mx-4 px-4" id="how-it-works">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple to use, powerful results</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Turn passive documents into active collaboration in minutes.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Upload your document</h3>
              <p className="text-gray-600">Paste in your document text or upload a file. We automatically convert it to markdown with votable elements.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Review the conversion</h3>
              <p className="text-gray-600">Navigate through your document with keyboard shortcuts, ensuring each element is properly formatted for voting.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Share with stakeholders</h3>
              <p className="text-gray-600">Invite participants via email or share a public link. They can vote, comment, and suggest versions for each element.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
              <h3 className="text-xl font-semibold mb-2">Analyze feedback</h3>
              <p className="text-gray-600">Review sentiment data and comments for each element, identifying areas of consensus and concern at a glance.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">5</div>
              <h3 className="text-xl font-semibold mb-2">Export final version</h3>
              <p className="text-gray-600">Generate a clean document with approved changes, or export detailed feedback data for further analysis.</p>
            </div>
          </div>
        </div>


        {/* FAQ */}
        <div className="py-16 bg-gray-50 -mx-4 px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to know about our document collaboration platform.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>What types of documents can I use with your platform?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Our platform works with plain text, Markdown, and most common document formats including Word (.docx), PDF, Google Docs, and more. We automatically convert these to a structured format with votable elements.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How many participants can I invite to review a document?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  This depends on your plan. Our free tier supports up to 25 participants per document, while our paid plans support from 100 to unlimited participants. All participants can vote, comment, and suggest changes to your documents.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How does the keyboard navigation work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You can navigate through document elements using the up/down arrow keys. Use left/right arrow keys to vote (approve/disapprove), press 'C' to add a comment, and press 'V' to suggest an alternative version of the text.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Is my data secure and private?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes, we take security and privacy seriously. All data is encrypted in transit and at rest. You control who has access to your documents through invitation links and permissions. Enterprise plans include additional security features like SSO and audit logs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Can I export the feedback and results?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Absolutely. You can export feedback data in various formats including CSV, JSON, and PDF. You can also generate a final document that incorporates approved changes and highlights areas of consensus or concern.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How long is data retained on the platform?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Data retention varies by plan: 7 days for the Free tier, 30 days for Community, 1 year for Professional, and unlimited for Enterprise. You can always export your data before the retention period ends.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Final CTA */}
        <div className="py-16 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Start transforming passive documents into collaborative decisions
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Convert your first document for free and see how easy it is to gather structured feedback from your stakeholders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="px-8 py-3 text-lg">
                Try for free
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
              See how it works
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold">CoDraft</span>
              </div>
              <p className="text-gray-400">
                Transform passive reading into active collaboration through precision engagement.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="#use-cases" className="hover:text-white">Use Cases</Link></li>
                <li><Link href="#" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white">Tutorials</Link></li>
                <li><Link href="#" className="hover:text-white">FAQ</Link></li>
                <li><Link href="#" className="hover:text-white">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
                <li><Link href="#" className="hover:text-white">Press</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">
              © 2025 CoDraft, Inc. All rights reserved.
            </p>
            <div className="flex space-x-6 text-gray-400 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white">Privacy</Link>
              <Link href="#" className="hover:text-white">Terms</Link>
              <Link href="#" className="hover:text-white">Data Processing</Link>
              <Link href="#" className="hover:text-white">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}