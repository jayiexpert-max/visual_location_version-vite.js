import { Outlet } from 'react-router-dom';
import '../styles/login.css';

export function AuthLayout() {
  return (
    <div className="login-page">
      <div className="particles" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>
      <Outlet />
    </div>
  );
}
