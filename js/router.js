// ═══════════════════════════════════════════════════════════════
// AR — التوجيه بين الصفحات (History API، بلا مكتبة)
// ═══════════════════════════════════════════════════════════════

const routes = []; // { pattern: RegExp, paramNames: string[], handler: fn }

function compilePath(path) {
  const paramNames = [];
  const pattern = path
    .replace(/:[a-zA-Z]+/g, (match) => {
      paramNames.push(match.slice(1));
      return '([^/]+)';
    })
    .replace(/\//g, '\\/');
  return { pattern: new RegExp(`^${pattern}$`), paramNames };
}

export function registerRoute(path, handler) {
  const { pattern, paramNames } = compilePath(path);
  routes.push({ pattern, paramNames, handler });
}

export function navigate(path, { replace = false } = {}) {
  if (replace) {
    history.replaceState({}, '', path);
  } else {
    history.pushState({}, '', path);
  }
  resolveRoute();
}

export function resolveRoute() {
  const path = window.location.pathname;

  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
      route.handler(params);
      return;
    }
  }

  // ماكاين راوت مطابق - نرجّع للصفحة الرئيسية
  navigate('/', { replace: true });
}

export function initRouter() {
  window.addEventListener('popstate', resolveRoute);

  // اعتراض كل نقر على رابط داخلي (data-link) لمنع إعادة تحميل الصفحة
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute('href'));
  });

  resolveRoute();
}
