export function routeFromLocation(location) {
  let pathname = location.pathname;
  if (pathname === '/login') {
    const callback = new URLSearchParams(location.search).get('callbackUrl');
    if (callback?.startsWith('/') && !callback.startsWith('//')) {
      const destination = new URL(callback, location.origin);
      if (destination.origin === location.origin)
        pathname = destination.pathname;
    }
  }
  let segments;
  try {
    segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { page: 'overview' };
  }
  const [root, id, child, transactionId] = segments;
  if (root === 'settings') return { page: 'overview', settings: 'merchant' };
  if (root === 'transactions' && id)
    return { page: child === 'evidence' ? 'evidence' : 'details', id };
  if (root === 'disputes' && id) {
    if (child === 'evidence' && transactionId)
      return { page: 'evidence', id: transactionId, disputeId: id };
    return { page: 'dispute-details', id };
  }
  if (['transactions', 'disputes', 'activity'].includes(root))
    return { page: root };
  return { page: 'overview' };
}

export function routePath(route) {
  if (route.settings) return '/settings';
  if (route.page === 'details')
    return `/transactions/${encodeURIComponent(route.id)}`;
  if (route.page === 'dispute-details')
    return `/disputes/${encodeURIComponent(route.id)}`;
  if (route.page === 'evidence') {
    return route.disputeId
      ? `/disputes/${encodeURIComponent(route.disputeId)}/evidence/${encodeURIComponent(route.id)}`
      : `/transactions/${encodeURIComponent(route.id)}/evidence`;
  }
  return route.page === 'overview' ? '/' : `/${route.page}`;
}
