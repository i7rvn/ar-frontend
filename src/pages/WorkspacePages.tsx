import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Bell, Eye, MessageCircle, Search, Settings, Sparkles, Users, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/lib/api'
import { registerOwnPublicKey, getConversationE2EMembers, encryptTextForRecipients, decryptTextMessage } from '@/lib/e2e'
import { relativeTime } from '@/lib/format'
import { useRealtimeConversation } from '@/lib/ws'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { ApiEnvelope, Conversation, Message, Post, StoryGroup, User } from '@/types/api'
import { PostCard } from '@/features/feed/PostCard'

function PageTitle({ icon: Icon, title, body }: { icon: typeof Search; title: string; body?: string }) {
  return <div className='border-b border-line px-5 py-5'><div className='flex items-center gap-3'><Icon className='text-brand' size={23} /><div><h1 className='font-display text-xl font-bold'>{title}</h1>{body && <p className='mt-1 text-sm text-muted'>{body}</p>}</div></div></div>
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q')?.trim() ?? ''
  const [q, setQ] = useState(urlQuery)
  const [submitted, setSubmitted] = useState(urlQuery)
  useEffect(() => { setQ(urlQuery); setSubmitted(urlQuery) }, [urlQuery])
  const result = useQuery({
    queryKey: ['search', submitted],
    enabled: submitted.length >= 2,
    queryFn: () => api.get<ApiEnvelope<{ posts: Post[]; users: User[]; hashtags: Array<{ tag: string; posts_count: number }> }>>(`/search?q=${encodeURIComponent(submitted)}`),
  })
  function submit(e: FormEvent) { e.preventDefault(); const term = q.trim(); setSubmitted(term); setSearchParams(term ? { q: term } : {}) }
  return <section>
    <PageTitle icon={Search} title='بحث' body='ابحث عن أشخاص ومنشورات ووسوم داخل AR' />
    <form onSubmit={submit} className='border-b border-line p-4'><Input label='البحث' value={q} onChange={(e) => setQ(e.target.value)} placeholder='اكتب كلمتين أو أكثر...' aria-label='البحث' /><Button type='submit' className='mt-3' disabled={q.trim().length < 2}>بحث</Button></form>
    {result.isPending && <div className='grid place-items-center p-10'><Spinner /></div>}
    {result.isError && <p className='p-8 text-center text-danger'>{result.error.message}</p>}
    {result.data && <div>
      {result.data.data.users.length > 0 && <div className='border-b border-line p-4'><h2 className='mb-3 font-bold'>الأشخاص</h2>{result.data.data.users.map((u) => <Link key={u.id} to={`/profile/${u.username}`} className='flex items-center gap-3 rounded-control p-2 hover:bg-brand-soft'><Avatar src={u.avatar_url} name={u.display_name} /><div><p className='font-semibold'>{u.display_name}</p><p className='text-sm text-muted'>@{u.username}</p></div></Link>)}</div>}
      {result.data.data.hashtags.length > 0 && <div className='border-b border-line p-4'><h2 className='mb-3 font-bold'>الوسوم</h2>{result.data.data.hashtags.map((h) => <Link key={h.tag} to={`/hashtag/${encodeURIComponent(h.tag)}`} className='block rounded-control p-2 hover:bg-brand-soft'><span className='font-semibold'>#{h.tag}</span><span className='ms-2 text-sm text-muted'>{h.posts_count}</span></Link>)}</div>}
      {result.data.data.posts.map((post) => <PostCard key={post.id} post={post} />)}
      {!result.data.data.posts.length && !result.data.data.users.length && !result.data.data.hashtags.length && <p className='p-10 text-center text-muted'>ما لقيناش نتائج.</p>}
    </div>}
  </section>
}

export function NotificationsPage() {
  const t = useT(); const qc = useQueryClient()
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<ApiEnvelope<{ notifications: Array<{ id:string; actor_username:string; actor_display_name:string; actor_avatar:string|null; type:string; created_at:string; is_read:boolean; post_content?:string }>; unread_count:number }>>('/notifications?limit=50') })
  const readAll = useMutation({ mutationFn: () => api.put('/notifications/read-all'), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })
  return <section><PageTitle icon={Bell} title={t('nav_notifications')} />
    <div className='flex items-center justify-between border-b border-line px-5 py-3'>{query.data && <span className='text-sm text-muted'>{query.data.data.unread_count} غير مقروء</span>}<Button variant='ghost' onClick={() => readAll.mutate()} disabled={readAll.isPending}>تعيين كمقروء</Button></div>
    {query.isPending ? <div className='p-8 text-center'><Spinner /></div> : query.isError ? <p className='p-8 text-center text-danger'>{query.error.message}</p> : <div>{query.data?.data.notifications.map((n) => <div key={n.id} className={cn('flex gap-3 border-b border-line px-5 py-4', !n.is_read && 'bg-brand-soft')}><Avatar src={n.actor_avatar} name={n.actor_display_name} size='sm' /><div className='min-w-0 flex-1'><p><strong>{n.actor_display_name}</strong> {n.type === 'follow' ? 'تابعك.' : 'تفاعل معك.'}</p><p className='mt-1 text-xs text-muted'>{relativeTime(n.created_at, 'ar')}</p>{n.post_content && <p className='mt-2 text-sm text-muted line-clamp-2'>{n.post_content}</p>}</div></div>)}</div>}
  </section>
}

function useConversations() { return useQuery({ queryKey: ['conversations'], queryFn: () => api.get<ApiEnvelope<Conversation[]>>('/messages/conversations?limit=50') }) }

export function MessagesPage() {
  const { id: activeId } = useParams(); const nav = useNavigate(); const user = useAuthStore((s) => s.user); const toast = useUiStore((s) => s.toast)
  const convs = useConversations()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<Message | null>(null)
  const conversations = convs.data?.data ?? []
  const current = conversations.find((c) => (c.conversation_id ?? c.id) === activeId) ?? conversations[0]
  const conversationId = current ? (current.conversation_id ?? current.id)! : undefined
  const messages = useQuery({
    queryKey: ['messages', conversationId],
    enabled: Boolean(conversationId),
    queryFn: () => api.get<ApiEnvelope<Message[]>>(`/messages/conversations/${conversationId}/messages?limit=50`),
  })

  const updateMessage = (message: Message) => {
    queryClient.setQueryData<ApiEnvelope<Message[]>>(['messages', conversationId], (old) => {
      if (!old) return old
      const found = old.data.findIndex((item) => item.id === message.id)
      if (found < 0) return { ...old, data: [...old.data, message] }
      const next = [...old.data]
      next[found] = { ...next[found], ...message }
      return { ...old, data: next }
    })
  }

  const updatePinned = (message: Message) => updateMessage(message)
  const realtime = useRealtimeConversation(conversationId, {
    onMessage: (message) => {
      updateMessage(message)
      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onMessageEdited: updateMessage,
    onMessageReaction: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    },
    onMessagePinned: updatePinned,
    onMessageUnpinned: updatePinned,
    onDelivered: () => {},
    onRead: () => {},
  })

  useEffect(() => { if (!conversationId && conversations[0]) nav(`/messages/${conversations[0].conversation_id ?? conversations[0].id}`, { replace: true }) }, [conversationId, conversations, nav])
  useEffect(() => { void registerOwnPublicKey().catch((e: Error) => toast(e.message, 'error')) }, [toast])

  const typingTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (typingTimer.current !== null) window.clearTimeout(typingTimer.current)
  }, [])

  const handleTyping = (value: string) => {
    setText(value)
    realtime.sendTyping(Boolean(value.trim()))
    if (typingTimer.current !== null) window.clearTimeout(typingTimer.current)
    if (value.trim()) {
      typingTimer.current = window.setTimeout(() => realtime.sendTyping(false), 1200)
    }
  }

  const send = useMutation({ mutationFn: async () => {
    if (!conversationId || !user || !text.trim()) throw new Error('الرسالة فارغة')
    const members = await getConversationE2EMembers(conversationId)
    if (members.some((member) => !member.keyId || !member.publicKeyJwk)) {
      throw new Error('بعض أعضاء المحادثة لم يسجلوا مفتاح E2E بعد')
    }
    const encrypted = await encryptTextForRecipients(
      text.trim(),
      members.map((member) => ({
        userId: member.userId,
        keyId: member.keyId!,
        publicKeyJwk: member.publicKeyJwk!,
      })),
    )
    return api.post('/messages/send', { conversationId, ...encrypted, msgType: 'text' })
  }, onSuccess: () => { setText(''); void messages.refetch(); void convs.refetch() }, onError: (e: Error) => toast(e.message, 'error') })
  return <section className='min-h-[calc(100dvh-1px)]'>
    <PageTitle icon={MessageCircle} title='الرسائل' body='محادثاتك الخاصة مع تشفير E2E من جهة العميل' />
    <div className='px-5 py-2 text-[11px] text-muted'>{realtime.status === 'open' ? 'متصل لحظياً' : 'جاري الاتصال…'}</div>
    <div className='grid min-h-[70dvh] md:grid-cols-[17rem_1fr]'>
      <aside className='border-e border-line'>{convs.isError && <p className='p-4 text-center text-danger'>{convs.error.message}</p>}{conversations.map((c) => { const cid = c.conversation_id ?? c.id!; return <button type='button' key={cid} onClick={() => nav(`/messages/${cid}`)} className={cn('flex w-full items-center gap-3 border-b border-line p-3 text-start hover:bg-brand-soft', cid === conversationId && 'bg-brand-soft')}><div className='grid size-9 place-items-center rounded-full bg-surface text-brand'>{c.type === 'group' ? <Users size={18} /> : <MessageCircle size={18} />}</div><div className='min-w-0'><p className='truncate font-semibold'>{c.display_name || c.name || 'محادثة مباشرة'}</p><p className='truncate text-xs text-muted'>{c.last_msg_text || 'لا توجد رسائل بعد'}</p></div>{(c.unread_count ?? 0) > 0 && <span className='ms-auto rounded-full bg-brand px-2 py-0.5 text-xs text-on-brand'>{c.unread_count}</span>}</button> })}</aside>
      <div className='flex min-h-[60dvh] flex-col'>{!conversationId ? <div className='grid flex-1 place-items-center p-8 text-center text-muted'>اختار محادثة للبدء.</div> : <><div className='flex-1 space-y-2 overflow-y-auto p-4'>{messages.isPending ? <Spinner /> : messages.isError ? <p className='p-6 text-center text-danger'>{messages.error.message}</p> : messages.data?.data.map((m) => <MessageBubble key={m.id} message={m} currentUserId={user?.id} onEdit={() => setEditing(m)} />)}{realtime.typingUserIds.length > 0 && <div className='text-xs text-muted'>جارٍ الكتابة…</div>}</div><form onSubmit={(e) => { e.preventDefault(); send.mutate() }} className='border-t border-line p-3'><div className='flex gap-2'><input value={text} onChange={(e) => handleTyping(e.target.value)} placeholder='اكتب رسالة مشفرة...' className='min-w-0 flex-1 rounded-control border border-line bg-transparent px-3 py-2 outline-none focus:border-brand' /><Button type='submit' loading={send.isPending}>إرسال</Button></div></form></>}</div>
    </div>
    <EditMessageModal message={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void messages.refetch() }} />
  </section>
}

function MessageBubble({ message, currentUserId, onEdit }: { message: Message; currentUserId?: string; onEdit: () => void }) {
  const [plain, setPlain] = useState<string | null>(null); const mine = currentUserId === message.sender_id
  useEffect(() => { let alive = true; decryptTextMessage(message).then((value) => { if (alive) setPlain(value) }).catch(() => { if (alive) setPlain('تعذر فك تشفير الرسالة') }); return () => { alive = false } }, [message])
  const react = useMutation({ mutationFn: (reaction: string) => api.post(`/messages/${message.id}/reaction`, { reaction }) })
  const pin = useMutation({ mutationFn: () => api.post(`/messages/${message.id}/pin`) })
  return <div className={cn('flex gap-2', mine && 'justify-end')}><div className={cn('max-w-[75%] rounded-surface px-3 py-2', mine ? 'bg-brand text-on-brand' : 'bg-raised')}><p className='whitespace-pre-wrap'>{plain ?? (message.is_deleted ? 'رسالة محذوفة' : 'رسالة مشفرة')}</p>{message.is_edited && <span className='mt-1 block text-[11px] opacity-70'>معدلة</span>}<div className='mt-1 flex items-center gap-2 text-[11px] opacity-70'><button type='button' onClick={() => react.mutate('❤️')} aria-label='قلب'>❤️</button><button type='button' onClick={() => react.mutate('😂')} aria-label='ضحك'>😂</button>{mine && <button type='button' onClick={onEdit}>تعديل</button>}<button type='button' onClick={() => pin.mutate()}>{message.is_pinned ? 'مثبت' : 'تثبيت'}</button></div></div></div>
}

function EditMessageModal({ message, onClose, onSaved }: { message: Message | null; onClose: () => void; onSaved: () => void }) {
  const [text, setText] = useState('')
  useEffect(() => { if (message) decryptTextMessage(message).then((v) => setText(v ?? '')).catch(() => setText('')) }, [message])
  const mutation = useMutation({ mutationFn: async () => {
    if (!message || !text.trim()) throw new Error('المحتوى فارغ')
    const members = await getConversationE2EMembers(message.conversation_id)
    if (members.some((member) => !member.keyId || !member.publicKeyJwk)) {
      throw new Error('بعض أعضاء المحادثة لم يسجلوا مفتاح E2E بعد')
    }
    const encrypted = await encryptTextForRecipients(
      text.trim(),
      members.map((member) => ({
        userId: member.userId,
        keyId: member.keyId!,
        publicKeyJwk: member.publicKeyJwk!,
      })),
    )
    return api.patch(`/messages/${message.id}`, {
      encryptedContent: encrypted.encrypted_content,
      nonce: encrypted.nonce,
      keyEnvelopes: encrypted.keyEnvelopes,
    })
  }, onSuccess: onSaved })
  return <Modal open={Boolean(message)} onClose={onClose} title='تعديل الرسالة'><textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className='w-full rounded-control border border-line bg-transparent p-3 outline-none focus:border-brand' /><Button className='mt-3' onClick={() => mutation.mutate()} loading={mutation.isPending}>حفظ التعديل</Button></Modal>
}

export function CommunitiesPage() {
  const q=useQuery({queryKey:['communities'],queryFn:()=>api.get<{success:boolean;myCommunities:Array<{id:string;slug:string;name:string;description:string|null;members_count:number}>;suggested:Array<{id:string;slug:string;name:string;description:string|null;members_count:number}>}>('/communities')})
  const qc=useQueryClient(); const toast=useUiStore((s)=>s.toast); const [createOpen,setCreateOpen]=useState(false); const [name,setName]=useState(''); const [description,setDescription]=useState('')
  const create=useMutation({mutationFn:()=>api.post('/communities',{name,description}),onSuccess:()=>{setCreateOpen(false);setName('');setDescription('');void qc.invalidateQueries({queryKey:['communities']});toast('تم إنشاء المجتمع','success')},onError:(e:Error)=>toast(e.message,'error')})
  const groups=[...(q.data?.myCommunities??[]),...(q.data?.suggested??[])]
  return <section><PageTitle icon={Users} title='المجتمعات' body='مجتمعات AR الخاصة بك والمقترحة' /><div className='border-b border-line p-4'><Button onClick={()=>setCreateOpen(true)}>إنشاء مجتمع</Button></div>{q.isPending?<div className='grid place-items-center p-10'><Spinner/></div>:q.isError?<p className='p-8 text-center text-danger'>{q.error.message}</p>:<div className='grid gap-4 p-4 sm:grid-cols-2'>{groups.map((community)=> <Link key={community.id} to={`/communities/${community.slug}`} className='rounded-surface border border-line bg-surface p-4 hover:border-brand'><p className='font-bold'>{community.name}</p><p className='mt-1 text-sm text-muted'>{community.description||'مجتمع AR'}</p><p className='mt-3 text-xs text-muted'>{community.members_count} أعضاء</p></Link>)}</div>}<Modal open={createOpen} onClose={()=>setCreateOpen(false)} title='إنشاء مجتمع'><div className='space-y-3'><Input label='اسم المجتمع' value={name} onChange={(e)=>setName(e.target.value)} maxLength={100}/><Input label='الوصف' value={description} onChange={(e)=>setDescription(e.target.value)} maxLength={500}/><Button onClick={()=>create.mutate()} loading={create.isPending} disabled={name.trim().length<3}>إنشاء</Button></div></Modal></section>
}
export function SettingsPage() {
  const user=useAuthStore((s)=>s.user); const toast=useUiStore((s)=>s.toast); const qc=useQueryClient();
  const [name,setName]=useState(user?.display_name??''); const [bio,setBio]=useState(user?.bio??''); const [location,setLocation]=useState(user?.location??''); const [website,setWebsite]=useState(user?.website??'');
  const [avatarFile,setAvatarFile]=useState<File|null>(null); const [bannerFile,setBannerFile]=useState<File|null>(null); const [phrase,setPhrase]=useState('')
  const filters=useQuery({queryKey:['word-filters'],queryFn:()=>api.get<ApiEnvelope<Array<{id:string;phrase:string;expires_at:string|null}>>>('/word-filters')})
  const save=useMutation({mutationFn:async()=>{
    const uploadOne=async(file:File)=>{const form=new FormData(); form.append('media',file); const r=await api.upload<{success:boolean;data:{files:Array<{id:string;url:string;type:string}>}}>('/media/upload',form); const item=r.data.files[0]; if(!item||item.type!=='image') throw new Error('الصورة غير صالحة'); return item.url}
    const avatar_url=avatarFile?await uploadOne(avatarFile):undefined; const banner_url=bannerFile?await uploadOne(bannerFile):undefined
    return api.put<ApiEnvelope<User>>('/users/profile',{display_name:name,bio,location,website,avatar_url,banner_url})
  },onSuccess:(r)=>{if(user)useAuthStore.getState().setUser({...user,...r.data});setAvatarFile(null);setBannerFile(null);toast('تم حفظ الملف','success')},onError:(e:Error)=>toast(e.message,'error')})
  const add=useMutation({mutationFn:()=>api.post('/word-filters',{phrase}),onSuccess:()=>{setPhrase('');void qc.invalidateQueries({queryKey:['word-filters']})},onError:(e:Error)=>toast(e.message,'error')})
  const remove=useMutation({mutationFn:(id:string)=>api.delete(`/word-filters/${id}`),onSuccess:()=>void qc.invalidateQueries({queryKey:['word-filters']}),onError:(e:Error)=>toast(e.message,'error')})
  return <section><PageTitle icon={Settings} title='الإعدادات' /><div className='space-y-6 p-5'>
    <div className='rounded-surface border border-line p-4'><h2 className='font-bold'>الملف الشخصي</h2><div className='mt-4 grid gap-4 sm:grid-cols-2'><Input label='الاسم' value={name} onChange={(e)=>setName(e.target.value)} /><Input label='الموقع' value={location} onChange={(e)=>setLocation(e.target.value)} /><Input label='الموقع الإلكتروني' value={website} onChange={(e)=>setWebsite(e.target.value)} /><div/><label className='text-sm text-muted'>صورة الحساب<input type='file' accept='image/jpeg,image/png,image/gif,image/webp' onChange={(e)=>setAvatarFile(e.target.files?.[0]??null)} className='mt-2 block w-full text-sm'/></label><label className='text-sm text-muted'>صورة الغلاف<input type='file' accept='image/jpeg,image/png,image/gif,image/webp' onChange={(e)=>setBannerFile(e.target.files?.[0]??null)} className='mt-2 block w-full text-sm'/></label></div><textarea aria-label='النبذة' value={bio} onChange={(e)=>setBio(e.target.value)} rows={4} maxLength={500} className='mt-4 w-full rounded-control border border-line bg-transparent p-3 outline-none focus:border-brand' placeholder='نبذة عنك' /><Button className='mt-3' onClick={()=>save.mutate()} loading={save.isPending}>حفظ</Button></div>
    <div className='rounded-surface border border-line p-4'><h2 className='font-bold'>فلاتر الكلمات في الفيد</h2><p className='mt-1 text-sm text-muted'>أي منشور يحتوي العبارة لن يظهر لك أثناء مدة الفلتر.</p><div className='mt-4 flex gap-2'><Input label='العبارة' value={phrase} onChange={(e)=>setPhrase(e.target.value)} placeholder='مثال: spoiler'/><Button onClick={()=>add.mutate()} disabled={!phrase.trim()} loading={add.isPending}>إضافة</Button></div><div className='mt-4 space-y-2'>{filters.isError && <p className='mt-3 text-sm text-danger'>{filters.error.message}</p>}{filters.data?.data.map((f)=><div key={f.id} className='flex items-center justify-between rounded-control bg-raised p-3'><span>{f.phrase}</span><button type='button' onClick={()=>remove.mutate(f.id)} className='text-danger' aria-label='حذف'><X size={18}/></button></div>)}</div></div>
  </div></section>
}
export function StatsPage() { const q=useQuery({queryKey:['stats'],queryFn:()=>api.get<any>('/stats?days=7')}); return <section><PageTitle icon={BarChart3} title='الإحصائيات' />{q.isPending?<div className='grid place-items-center p-10'><Spinner/></div>:q.isError?<p className='p-8 text-center text-danger'>{q.error.message}</p>:<div className='grid gap-3 p-4 sm:grid-cols-2'>{['impressions','engagement','profileVisits','newFollowers'].map((k)=><div key={k} className='rounded-surface border border-line bg-surface p-4'><p className='text-sm text-muted'>{k}</p><p className='mt-2 text-2xl font-bold'>{q.data?.[k]?.value??0}</p><p className='text-xs text-muted'>{q.data?.[k]?.changePercent??0}% مقارنة بالفترة السابقة</p></div>)}</div>}</section> }

export function ProfilePage() { const {username}=useParams(); const q=useQuery({queryKey:['profile',username],queryFn:()=>api.get<ApiEnvelope<User>>(`/users/${encodeURIComponent(username!)}`),enabled:Boolean(username)}); const user=q.data?.data; const follow=useMutation({mutationFn:()=>api.post(`/follows/${user?.id}`),onSuccess:()=>q.refetch()}); const posts=useQuery({queryKey:['profile-posts',user?.id],enabled:Boolean(user?.id&&user?.canViewPosts!==false),queryFn:()=>api.get<ApiEnvelope<{posts:Post[]}>>(`/feed/user/${user!.id}?limit=20`)}); return <section>{q.isPending?<div className='grid place-items-center p-10'><Spinner/></div>:q.isError?<p className='p-10 text-center text-danger'>{q.error.message}</p>:!user?<p className='p-10 text-center'>المستخدم غير موجود</p>:<><div className='border-b border-line p-5'><div className='flex items-center gap-4'><Avatar src={user.avatar_url} name={user.display_name} size='lg'/><div className='min-w-0 flex-1'><h1 className='text-xl font-bold'>{user.display_name}</h1><p className='text-muted'>@{user.username}</p></div>{useAuthStore.getState().user?.id!==user.id&&<Button variant={user.isFollowing?'secondary':'primary'} onClick={()=>follow.mutate()}>{user.isFollowing?'متابَع':'متابعة'}</Button>}</div><p className='mt-4 whitespace-pre-wrap'>{user.bio}</p><div className='mt-4 flex gap-5 text-sm text-muted'><span>{user.posts_count??0} منشور</span><span>{user.followers_count??0} متابع</span><span>{user.following_count??0} يتابع</span></div></div>{user.canViewPosts===false?<p className='p-10 text-center text-muted'>هذا الحساب خاص. تابع الحساب لرؤية منشوراته.</p>:posts.isPending?<div className='grid place-items-center p-10'><Spinner/></div>:posts.isError?<p className='p-8 text-center text-danger'>{posts.error.message}</p>:posts.data?.data.posts.length?posts.data.data.posts.map(p=><PostCard key={p.id} post={p}/>):<p className='p-8 text-center text-muted'>لا توجد منشورات بعد.</p>}</>}</section> }

export function PostPage() { const {id}=useParams(); const q=useQuery({queryKey:['post',id],queryFn:()=>api.get<ApiEnvelope<Post>>(`/posts/${id}`),enabled:Boolean(id)}); return <section>{q.isPending?<div className='grid place-items-center p-10'><Spinner/></div>:q.isError?<p className='p-10 text-center text-danger'>{q.error.message}</p>:q.data?<PostCard post={q.data.data}/>:<p className='p-10 text-center'>المنشور غير موجود</p>}</section> }

export function HashtagPage() { const {tag}=useParams(); const q=useQuery({queryKey:['hashtag',tag],queryFn:()=>api.get<ApiEnvelope<{posts:Post[]}>>(`/hashtags/${encodeURIComponent(tag!)}`),enabled:Boolean(tag)}); return <section><PageTitle icon={Sparkles} title={`#${tag}`} />{q.isPending?<div className='grid place-items-center p-10'><Spinner/></div>:q.isError?<p className='p-8 text-center text-danger'>{q.error.message}</p>:q.data?.data.posts?.length?q.data.data.posts.map((p)=><PostCard key={p.id} post={p}/>):<p className='p-8 text-center text-muted'>ما كايناش منشورات بهذا الوسم.</p>}</section> }

export function CommunityPage() {
  const {slug}=useParams(); const qc=useQueryClient(); const toast=useUiStore((s)=>s.toast)
  const q=useQuery({queryKey:['community',slug],queryFn:()=>api.get<any>(`/communities/${encodeURIComponent(slug!)}`),enabled:Boolean(slug)})
  const posts=useQuery({queryKey:['community-posts',slug],queryFn:()=>api.get<any>(`/communities/${encodeURIComponent(slug!)}/posts?limit=20`),enabled:Boolean(slug)})
  const joined=Boolean(q.data?.isMember)
  const memberMutation=useMutation({mutationFn:()=>api.post(`/communities/${encodeURIComponent(slug!)}/${joined?'leave':'join'}`),onSuccess:()=>{void qc.invalidateQueries({queryKey:['community',slug]});void qc.invalidateQueries({queryKey:['communities']});toast(joined?'تم مغادرة المجتمع':'تم الانضمام للمجتمع','success')},onError:(e:Error)=>toast(e.message,'error')})
  return <section>{q.isPending?<div className='grid place-items-center p-10'><Spinner/></div>:q.isError?<p className='p-8 text-center text-danger'>{q.error.message}</p>:!q.data?<p className='p-8 text-center text-muted'>المجتمع غير موجود.</p>:<><div className='border-b border-line p-5'><div className='flex items-center gap-3'><div className='min-w-0 flex-1'><h1 className='text-2xl font-bold'>{q.data.community.name}</h1><p className='mt-1 text-muted'>{q.data.community.description}</p><p className='mt-2 text-xs text-muted'>{q.data.community.members_count} أعضاء</p></div><Button variant={joined?'secondary':'primary'} onClick={()=>memberMutation.mutate()} loading={memberMutation.isPending}>{joined?'مغادرة':'انضمام'}</Button></div></div>{posts.isPending?<div className='grid place-items-center p-10'><Spinner/></div>:posts.isError?<p className='p-8 text-center text-danger'>{posts.error.message}</p>:posts.data?.posts?.length?posts.data.posts.map((post:Post)=><PostCard key={post.id} post={post}/>):<p className='p-8 text-center text-muted'>لا توجد منشورات في هذا المجتمع بعد.</p>}</>}</section>
}
export function StoriesPage() { const q=useQuery({queryKey:['stories'],queryFn:()=>api.get<ApiEnvelope<StoryGroup[]>>('/stories')}); return <section><PageTitle icon={Eye} title='Stories' body='محتوى يختفي تلقائياً بعد 24 ساعة' />{q.isPending?<div className='grid place-items-center p-10'><Spinner/></div>:q.isError?<p className='p-8 text-center text-danger'>{q.error.message}</p>:!q.data?.data.length?<p className='p-8 text-center text-muted'>لا توجد قصص حاليًا.</p>:<div className='space-y-5 p-4'>{q.data?.data.map((group)=> <div key={group.userId}><div className='mb-2 flex items-center gap-2'><Avatar src={group.avatarUrl} name={group.displayName} size='sm'/><p className='font-semibold'>{group.displayName}</p></div><div className='grid gap-3 sm:grid-cols-2'>{group.stories.map((story)=><article key={story.id} className='overflow-hidden rounded-surface border border-line bg-surface'>{story.type==='video'?<video src={story.url} controls className='aspect-[9/16] w-full object-cover'/>:<img src={story.url} alt='' className='aspect-[9/16] w-full object-cover'/>}<div className='p-3'><p className='text-sm'>{story.caption}</p></div></article>)}</div></div>)}</div>}</section> }