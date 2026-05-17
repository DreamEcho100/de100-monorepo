import { A, useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";

import { authClient } from "~/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);

  return (
    <div class="user-menu">
      <Show when={session().isPending}>
        <div aria-hidden="true" class="loading-pill" />
      </Show>

      <Show when={!(session().isPending || session().data)}>
        <A class="button secondary" href="/login">
          Sign In
        </A>
      </Show>

      <Show when={!session().isPending && session().data}>
        <button
          aria-expanded={isMenuOpen()}
          aria-haspopup="menu"
          class="user-trigger"
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
        >
          {session().data?.user.name}
        </button>

        <Show when={isMenuOpen()}>
          <div class="menu-popover" role="menu">
            <p class="menu-text">{session().data?.user.email}</p>
            <button
              class="button secondary"
              onClick={() => {
                setIsMenuOpen(false);
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      navigate("/");
                    },
                  },
                });
              }}
              type="button"
            >
              Sign Out
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
}
