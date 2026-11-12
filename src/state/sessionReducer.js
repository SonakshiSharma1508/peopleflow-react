/** Pure reducer: domain commands prepare their next state before dispatching. */
export function sessionReducer(session, action) {
  switch (action.type) {
    case 'session/replaced':
      return action.session;
    case 'session/conflict':
      return {
        ...session,
        recoveryMode: true,
        warning:
          'This demo changed in another tab. Reload before editing to avoid overwriting those changes. Your changes in this tab will stay temporary.',
      };
    default:
      return session;
  }
}
