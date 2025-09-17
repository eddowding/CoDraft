'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Navbar } from '@/components/layout/navbar'

interface User {
  id: string
  email: string
  email_verified: boolean | null
  created_at: string | null
  last_seen: string | null
  votes_count: number | null
}

interface AdminStats {
  totalRegistered: number
  users: User[]
  totalVotes: number
  votesByStatus: {
    authorized: number
    unauthorized: number
    anonymous: number
  }
  bestPerformingDocuments: Array<{
    id: string
    title: string
    totalVotes: number
    averageScore: number
    elementCount: number
  }>
  allDocuments: Array<{
    id: string
    title: string
    created_at: string
    updated_at: string
    author_id: string | null
    owner_username: string | null
    owner_full_name: string | null
    owner_email: string | null
    elements_count: number
    votes_total: number
  }>
}

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const router = useRouter()
  const supabase = createClientSupabase()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/auth', { cache: 'no-store' })
      const data = await response.json()

      if (data.isAdmin) {
        setIsAdmin(true)
        fetchStats()
      } else {
        router.push('/auth')
      }
    } catch {
      router.push('/auth')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      setRefreshing(true)
      console.log('Fetching admin stats...')
      const response = await fetch('/api/admin/stats', { cache: 'no-store' })
      console.log('Stats response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Stats data:', data)
        setStats(data)
        setLastRefreshed(new Date())
      } else {
        const errorData = await response.text()
        console.error('Stats error:', errorData)
        setError(`Failed to fetch stats: ${response.status}`)
      }
    } catch (err) {
      console.error('Stats fetch error:', err)
      setError('Failed to fetch stats')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Checking admin permissions...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>You don't have admin permissions to access this page.</AlertDescription>
            </Alert>
            <Button className="w-full mt-4" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              {lastRefreshed && (
                <span className="text-sm text-gray-500">Last refreshed {lastRefreshed.toLocaleTimeString()}</span>
              )}
              <Button variant="outline" size="sm" onClick={fetchStats} disabled={refreshing}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!stats && !error && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Loading admin data...</p>
            </div>
          )}

        {stats && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="votes">Votes</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Registered Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalRegistered}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalVotes}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Authorized Votes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.votesByStatus.authorized}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Unauthorized Votes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.votesByStatus.unauthorized}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Vote Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Authorized (Verified Email)</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {stats.votesByStatus.authorized}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Unauthorized (Unverified Email)</span>
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        {stats.votesByStatus.unauthorized}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Anonymous (No Email)</span>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        {stats.votesByStatus.anonymous}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Registered Users ({stats.totalRegistered})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Email</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Verified</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Joined</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Last Seen</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Votes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.users.map((user) => (
                          <tr key={user.id} className="border-t">
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{user.email}</td>
                            <td className="px-4 py-2 text-sm">
                              <Badge variant={user.email_verified ? 'default' : 'secondary'}>
                                {user.email_verified ? 'Verified' : 'Unverified'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{user.last_seen ? new Date(user.last_seen).toLocaleDateString() : '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{user.votes_count || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="votes" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">Authorized Votes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.votesByStatus.authorized}</div>
                    <p className="text-sm text-gray-500">From verified email users</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Unauthorized Votes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.votesByStatus.unauthorized}</div>
                    <p className="text-sm text-gray-500">From unverified email users</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-600">Anonymous Votes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.votesByStatus.anonymous}</div>
                    <p className="text-sm text-gray-500">From users without email</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Best Performing Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.bestPerformingDocuments.map((doc, index) => (
                      <div key={doc.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="font-medium">{doc.title}</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {doc.elementCount} elements • {doc.totalVotes} total votes
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {doc.averageScore.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">avg score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Title</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Owner (email)</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Votes</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Created</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.allDocuments.map((doc) => (
                          <tr key={doc.id} className="border-t">
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{doc.title}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{doc.owner_email || '—'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{doc.votes_total}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        </div>
      </div>
    </div>
  )
}
