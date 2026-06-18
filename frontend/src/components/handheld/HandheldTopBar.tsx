import { Link } from 'react-router-dom';

interface HandheldTopBarProps {
  mode?: 'menu' | 'page';
  title: string;
  kicker?: string;
  user?: string;
  showLogout?: boolean;
  onLogout?: () => void;
}

export function HandheldTopBar({
  mode = 'page',
  title,
  kicker = 'KEYENCE BT-A500',
  user,
  showLogout,
  onLogout,
}: HandheldTopBarProps) {
  if (mode === 'menu') {
    return (
      <>
        <div className="fx-hh-top fx-hh-top--menu">
          <span className="fx-hh-kicker">{kicker}</span>
          <span className="fx-hh-title">{title}</span>
        </div>
        {user ? <p className="fx-hh-user">{user}</p> : null}
      </>
    );
  }

  return (
    <div className="fx-hh-top">
      <Link to="/handheld" className="fx-hh-back" aria-label="Back to menu">
        &larr; Back
      </Link>
      <span className="fx-hh-title">{title}</span>
      {showLogout ? (
        <button
          type="button"
          className="fx-hh-logout"
          aria-label="Logout"
          title="Logout"
          onClick={onLogout}
        >
          &times;
        </button>
      ) : null}
    </div>
  );
}
