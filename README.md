# AR — الواجهة الجديدة (v2)

TypeScript · React 19 · Vite · Tailwind CSS v4 · TanStack Query · Zustand · Framer Motion (LazyMotion) · React Router · Lucide

مشروع **منفصل** عن الموقع الحالي (vanilla JS): يتكلم مع نفس الباك اند بنفس الـAPIs. الموقع القديم يبقى هو الفعّال لين تكتمل الصفحات.

## التشغيل
```bash
npm install
cp .env.example .env     # اختياري — القيم الافتراضية = الإنتاج الحالي
npm run dev
npm run check            # typecheck + oxlint + build
```

## النشر (Vercel)
- مشروع جديد على Vercel، Framework: Vite. `vercel.json` يضبط SPA rewrite + CSP صارمة + رؤوس أمان.
- **CORS بالباك اند (Render):** غيّر `FRONTEND_URL` لقائمة مفصولة بفاصلة تضم القديم والجديد:
  `FRONTEND_URL=https://ar4ar.vercel.app,https://<الجديد>.vercel.app`
  (أول عنوان = العنوان الأساسي لروابط QR/impersonation/البريد).

## البنية
```
src/
  lib/          api.ts (عميل + تجديد توكن)، tokens، config، format، useInView
  stores/       auth (الجلسة)، ui (ثيم/لغة/toasts)
  i18n/         dictionary.ts (ar/en/fr — ناقص مفتاح = خطأ وقت البناء)
  components/
    ui/         Button Input Avatar Modal Popover Skeleton Toaster ...
    layout/     AppShell AuthLayout navItems UserMenu RouteGuards
  features/     auth/  feed/  widgets/
```

## التصميم المتجاوب (mobile-first)
| العرض | التخطيط |
|---|---|
| < 768 | شريط علوي + محتوى + شريط تنقل سفلي + زر نشر عائم + ورقة سفلية للنشر |
| 768–1279 | عمود أيقونات جانبي + محتوى |
| ≥ 1280 | شريط جانبي موسّع + محتوى + عمود (بحث، الرائج، اقتراحات) |

RTL/LTR تلقائي من `dir` على `<html>`؛ كل المحاذاة بخصائص منطقية (`ms-*` `pe-*` `start-*`) ونصوص المستخدمين بـ`dir="auto"`.

## ما تم نقله
- تسجيل الدخول (+2FA/رمز استرجاع، قفل الحساب) · التسجيل (بريد/واتساب، OTP، كود دعوة `?invite=`)
- الفيد (لأجلك/المتابَعون، تمرير لانهائي، إعجاب متفائل) · النشر (مع حد 280 يفرضه الباك اند)
- الجلسة (تجديد توكن تلقائي، تسجيل خروج يلغي التوكنات بالخادم)
- الثيم الداكن/الفاتح + ar/fr/en

## لم يُنقل بعد (صفحاته تعرض "قريباً")
البروفايل · تفاصيل المنشور/الردود · الإشعارات · الرسائل · المجتمعات · الإعدادات · البحث · الهاشتاغ · الإحصائيات
· رفع الوسائط بالمؤلف · قائمة المنشور (حذف/تثبيت/إبلاغ/حظر/كتم/تقييد).
