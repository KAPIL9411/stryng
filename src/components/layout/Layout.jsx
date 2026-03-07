import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  const location = useLocation();
  
  // Hide header and footer on auth pages
  const authPages = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  const hideHeaderFooter = authPages.includes(location.pathname);
  
  return (
    <>
      {!hideHeaderFooter && <Header />}
      <main>
        <Outlet />
      </main>
      {!hideHeaderFooter && <Footer />}
    </>
  );
}
