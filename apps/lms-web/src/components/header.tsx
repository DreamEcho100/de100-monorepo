import { A } from "@solidjs/router";
import { For } from "solid-js";

import UserMenu from "~/components/user-menu";

const links = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/todos", label: "Todos" },
];

export default function Header() {
  return (
    <header class="topbar">
      <div class="topbar-inner">
        <nav aria-label="Primary" class="topbar-nav">
          <For each={links}>
            {(link) => (
              <A activeClass="is-active" class="nav-link" href={link.href}>
                {link.label}
              </A>
            )}
          </For>
        </nav>
        <UserMenu />
      </div>
    </header>
  );
}
