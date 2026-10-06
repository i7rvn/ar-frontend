import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { Toaster } from '@/components/ui/Toaster'
import { AppShell } from '@/components/layout/AppShell'
import { GuestOnly, RequireAuth } from '@/components/layout/RouteGuards'
import { useBootstrapSession } from '@/features/auth/useSession'
import { NotFound } from '@/pages/NotFound'
import { SearchPage, NotificationsPage, MessagesPage, CommunitiesPage, CommunityPage, SettingsPage, StatsPage, ProfilePage, PostPage, HashtagPage, StoriesPage } from '@/pages/WorkspacePages'

const FeedPage = lazy(() => import('@/features/feed/FeedPage').then((m) => ({ default: m.FeedPage })))
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))

const PageLoader = () => <div className='grid min-h-[40dvh] place-items-center text-brand'><Spinner className='size-6' /></div>

export default function App() {
  useBootstrapSession()
  return <>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<FeedPage />} />
            <Route path='search' element={<SearchPage />} />
            <Route path='notifications' element={<NotificationsPage />} />
            <Route path='messages' element={<MessagesPage />} />
            <Route path='messages/:id' element={<MessagesPage />} />
            <Route path='communities' element={<CommunitiesPage />} />
            <Route path='communities/:slug' element={<CommunityPage />} />
            <Route path='stories' element={<StoriesPage />} />
            <Route path='settings' element={<SettingsPage />} />
            <Route path='stats' element={<StatsPage />} />
            <Route path='profile/:username' element={<ProfilePage />} />
            <Route path='post/:id' element={<PostPage />} />
            <Route path='hashtag/:tag' element={<HashtagPage />} />
            <Route path='*' element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
    <Toaster />
  </>
}