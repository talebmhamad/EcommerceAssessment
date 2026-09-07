"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { queryKeys } from "@/features/query/query-keys";
import { Spinner } from "@/features/ui/Loading";
import { getCart } from "@/services/api";

const navLinks = [
  {
    href: "/products",
    label: "Products"
  },
  {
    href: "/wishlist",
    label: "Wishlist"
  },
  {
    href: "/cart",
    label: "Cart"
  }
] as const;

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav(): React.ReactElement {
  const pathname = usePathname();
  const { logout, status, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: cart, isLoading: isCartCountLoading } = useQuery({
    enabled: status === "authenticated",
    queryFn: getCart,
    queryKey: queryKeys.cart
  });
  const cartCount = useMemo(
    () => cart?.items.reduce((total, item) => total + item.quantity, 0),
    [cart]
  );

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="app-nav">
      <div className="app-nav__inner">
        <Link className="app-nav__brand" href="/products">
          Ecommerce
        </Link>

        <button
          aria-controls="app-nav-menu"
          aria-expanded={isMenuOpen}
          className="app-nav__toggle"
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          Menu
        </button>

        <div
          className={
            isMenuOpen ? "app-nav__menu app-nav__menu--open" : "app-nav__menu"
          }
          id="app-nav-menu"
        >
          <nav aria-label="Primary navigation" className="app-nav__links">
            {navLinks.map((link) => {
              const isActive = isActivePath(pathname, link.href);

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "app-nav__link app-nav__link--active"
                      : "app-nav__link"
                  }
                  href={link.href}
                  key={link.href}
                >
                  <span>{link.label}</span>
                  {link.href === "/cart" ? (
                    cartCount !== undefined ? (
                      <span
                        aria-label={`${cartCount} cart items`}
                        className="app-nav__count"
                      >
                        {cartCount}
                      </span>
                    ) : isCartCountLoading ? (
                      <Spinner label="Loading cart count" size="small" />
                    ) : null
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="app-nav__account">
            <span className="session-email">{user?.email}</span>
            <button
              className="button button--secondary"
              onClick={logout}
              type="button"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
