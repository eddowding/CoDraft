'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClientSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Users,
  MessageCircle,
  ThumbsUp,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Check,
  ChevronRight,
  Sparkles,
  Globe,
  Building2,
  GraduationCap,
  TreePine
} from 'lucide-react'

export default function HomePage() {
  // null = still resolving auth state (avoid flashing the wrong CTA)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClientSupabase()
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session?.user))
    return () => subscription.unsubscribe()
  }, [])

  const primaryHref = signedIn ? '/dashboard' : '/auth'
  const primaryLabel = signedIn ? 'Go to Dashboard' : 'Start Free Trial'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                DocVote
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                How It Works
              </Link>
              <Link href="#use-cases" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Use Cases
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {signedIn === null ? null : signedIn ? (
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm font-medium shadow-lg shadow-blue-500/25">
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth">
                    <Button variant="ghost" className="text-sm font-medium">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm font-medium shadow-lg shadow-blue-500/25">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
              <Sparkles className="mr-1.5 h-3 w-3" />
              Trusted by 500+ organizations worldwide
            </Badge>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                Turn Documents Into
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Collaborative Decisions
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Gather structured feedback from hundreds of stakeholders with element-level voting,
              contextual comments, and real-time consensus visualization.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href={primaryHref}>
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-base px-8 py-6 shadow-xl shadow-blue-500/25">
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-6 border-slate-300 hover:bg-slate-50">
                  See Live Demo
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full border-2 border-white ${
                      ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'][i]
                    } flex items-center justify-center text-white text-xs font-medium`}>
                      {['SC', 'MR', 'EJ', 'AK'][i]}
                    </div>
                  ))}
                </div>
                <span>3,000+ happy users</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" id="demo">
        <div className="container mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1 shadow-2xl">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20"></div>
              <div className="relative rounded-xl bg-slate-900 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1.5 bg-slate-700/50 rounded-lg text-xs text-slate-400 flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      docvote.app/docs/park-renovation
                    </div>
                  </div>
                </div>

                {/* Demo content */}
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">City Park Renovation Proposal</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          142 participants
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4" />
                          80 comments
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Live</Badge>
                  </div>

                  <div className="space-y-4">
                    {/* High approval item */}
                    <div className="group relative p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer">
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-green-500"></div>
                      <p className="text-slate-200 mb-3 pl-2">
                        The proposed renovation will add accessible pathways throughout the park, ensuring all community members can enjoy the space.
                      </p>
                      <div className="flex items-center gap-4 pl-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-24 rounded-full bg-slate-700 overflow-hidden">
                            <div className="h-full w-[87%] bg-gradient-to-r from-green-500 to-green-400 rounded-full"></div>
                          </div>
                          <span className="text-sm font-medium text-green-400">87%</span>
                        </div>
                        <span className="text-xs text-slate-500">124 votes</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> 12
                        </span>
                      </div>
                    </div>

                    {/* Contested item */}
                    <div className="group relative p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer">
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-amber-500"></div>
                      <Badge className="absolute top-3 right-3 bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                        Needs Discussion
                      </Badge>
                      <p className="text-slate-200 mb-3 pl-2 pr-28">
                        The proposed plan will remove 12 mature trees to accommodate additional parking spaces.
                      </p>
                      <div className="flex items-center gap-4 pl-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-24 rounded-full bg-slate-700 overflow-hidden">
                            <div className="h-full w-[32%] bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"></div>
                          </div>
                          <span className="text-sm font-medium text-amber-400">32%</span>
                        </div>
                        <span className="text-xs text-slate-500">138 votes</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> 45
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Keyboard hints */}
                  <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-center gap-6 text-xs text-slate-500">
                    <span className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono">←→</kbd>
                      Vote
                    </span>
                    <span className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono">C</kbd>
                      Comment
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50" id="features">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-indigo-50 text-indigo-700 border-indigo-200">Features</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Everything you need for
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                collaborative feedback
              </span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful tools designed to make gathering and analyzing document feedback effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: ThumbsUp,
                title: 'Element-Level Voting',
                description: 'Stakeholders approve or disapprove specific paragraphs, creating granular feedback data.',
                color: 'blue'
              },
              {
                icon: MessageCircle,
                title: 'Contextual Comments',
                description: 'Comments are tied directly to content, keeping discussions focused and organized.',
                color: 'green'
              },
              {
                icon: BarChart3,
                title: 'Real-Time Analytics',
                description: 'Instant visualization of consensus and contention across your entire document.',
                color: 'purple'
              },
              {
                icon: Zap,
                title: 'Keyboard-First Design',
                description: 'Navigate and vote efficiently with intuitive keyboard shortcuts.',
                color: 'amber'
              },
              {
                icon: Users,
                title: 'Scale to Thousands',
                description: 'Handle feedback from hundreds or thousands of participants effortlessly.',
                color: 'rose'
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                description: 'SOC 2 compliant with SSO, audit logs, and data encryption at rest.',
                color: 'slate'
              }
            ].map((feature, index) => (
              <Card key={index} className="group relative overflow-hidden border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-${feature.color}-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8" id="how-it-works">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-50 text-green-700 border-green-200">How It Works</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              From document to decisions
              <br />
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                in minutes
              </span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Connection line */}
              <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 hidden md:block"></div>

              <div className="space-y-8">
                {[
                  {
                    step: '01',
                    title: 'Upload your document',
                    description: 'Paste text or upload files. We automatically convert to an interactive format.',
                    color: 'blue'
                  },
                  {
                    step: '02',
                    title: 'Share with stakeholders',
                    description: 'Send a link or invite by email. No account required for participants.',
                    color: 'purple'
                  },
                  {
                    step: '03',
                    title: 'Collect structured feedback',
                    description: 'Stakeholders vote, comment, and suggest changes to specific elements.',
                    color: 'indigo'
                  },
                  {
                    step: '04',
                    title: 'Analyze and act',
                    description: 'See instant consensus visualization and export actionable reports.',
                    color: 'green'
                  }
                ].map((item, index) => (
                  <div key={index} className="relative flex gap-6 md:gap-8 items-start">
                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-${item.color}-100 flex items-center justify-center text-2xl font-bold text-${item.color}-600 z-10`}>
                      {item.step}
                    </div>
                    <div className="flex-1 pt-2">
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                      <p className="text-slate-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50" id="use-cases">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-50 text-purple-700 border-purple-200">Use Cases</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Built for organizations
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                that value every voice
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Building2,
                title: 'Public Policy',
                description: 'Gather citizen feedback on proposals, regulations, and community plans.',
                stat: '3,000+ residents engaged',
                color: 'blue'
              },
              {
                icon: Globe,
                title: 'Open Source',
                description: 'Coordinate RFC discussions and governance decisions across contributors.',
                stat: 'Global community input',
                color: 'green'
              },
              {
                icon: GraduationCap,
                title: 'Education',
                description: 'Develop curriculum standards with input from educators and parents.',
                stat: '500+ teachers consulted',
                color: 'purple'
              },
              {
                icon: TreePine,
                title: 'Non-Profits',
                description: 'Align stakeholders on strategic plans and grant proposals.',
                stat: 'Mission-driven feedback',
                color: 'emerald'
              }
            ].map((useCase, index) => (
              <Card key={index} className="group relative overflow-hidden border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-${useCase.color}-500 to-${useCase.color}-600 flex items-center justify-center mb-4 shadow-lg`}>
                    <useCase.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{useCase.title}</h3>
                  <p className="text-slate-600 text-sm mb-4">{useCase.description}</p>
                  <p className="text-xs font-medium text-slate-500">{useCase.stat}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
              <CardContent className="relative p-8 sm:p-12">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-xl sm:text-2xl font-medium mb-8 leading-relaxed">
                  "DocVote transformed our public consultation process. We received structured feedback from over
                  3,000 residents on our climate action plan, with clear visualization of which proposals had
                  broad support and which needed revision."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg font-semibold">
                    SC
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Sarah Chen</div>
                    <div className="text-slate-400">Director of Community Engagement, City of Portland</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to transform your
            <br />
            document feedback?
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">
            Join hundreds of organizations gathering better feedback, faster.
            Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={primaryHref}>
              <Button size="lg" className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-slate-50 text-base px-8 py-6 shadow-xl">
                {primaryLabel}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-6 border-white/30 text-white hover:bg-white/10">
                Talk to Sales
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-blue-200">
            No credit card required. Free for up to 25 participants.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">DocVote</span>
              </div>
              <p className="text-sm">
                Transform passive documents into collaborative decisions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#use-cases" className="hover:text-white transition-colors">Use Cases</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Press</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              © 2025 DocVote. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
