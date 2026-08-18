const Auth = {
  currentUser: null,

  async getCurrentUser() {
    try {
      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        this.currentUser = null;
        return null;
      }

      const data = await response.json();

      this.currentUser = data.user;

      return this.currentUser;

    } catch (error) {
      console.error('Failed to get current user:', error);

      this.currentUser = null;

      return null;
    }
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }

    this.currentUser = null;

    window.location.href = '/';
  },

  getInitials(name) {
    if (!name) return '?';

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
};

async function initializeProfileUI() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDrawer = document.getElementById('profileDrawer');
    const profileBody = document.getElementById('profileBody');
    const profileClose = document.getElementById('profileClose');

    if (!profileBtn || !profileDrawer || !profileBody) {
        return;
    }

    const user = await Auth.getCurrentUser();

    if (!user) {
        profileBody.innerHTML = `
            <p>
                Sign in to view orders, saved items,
                and delivery addresses.
            </p>

            <a
                href="/login"
                class="btn btn-primary btn-full"
            >
                Sign In
            </a>

            <a
                href="/register"
                class="btn btn-ghost btn-full"
            >
                Create Account
            </a>
        `;
    } else {
        const initials = Auth.getInitials(user.name);

        profileBtn.innerHTML = `
            <span class="profile-avatar">
                ${initials}
            </span>
        `;

        profileBtn.setAttribute(
            'aria-label',
            `Profile of ${user.name}`
        );

        const adminButton = user.role === 'admin'
            ? `
                <a
                    href="/admin"
                    class="btn btn-ghost btn-full"
                >
                    Admin Panel
                </a>
            `
            : '';

        profileBody.innerHTML = `
            <div class="profile-user">

                <div class="profile-avatar profile-avatar-large">
                    ${initials}
                </div>

                <div class="profile-user-info">
                    <strong>${user.name}</strong>
                    <span>${user.email}</span>
                </div>

            </div>

            <a
                href="/profile"
                class="btn btn-primary btn-full"
            >
                My Profile
            </a>

            <a
                href="/orders"
                class="btn btn-ghost btn-full"
            >
                My Orders
            </a>

            ${adminButton}

            <button
                type="button"
                class="btn btn-ghost btn-full"
                id="logoutBtn"
            >
                Sign Out
            </button>
        `;
        const logoutBtn =
            document.getElementById('logoutBtn');

        if (logoutBtn) {
            logoutBtn.addEventListener(
                'click',
                () => Auth.logout()
            );
        }
    }

    profileBtn.addEventListener('click', () => {
        profileDrawer.classList.add('open');
    });

    if (profileClose) {
        profileClose.addEventListener('click', () => {
            profileDrawer.classList.remove('open');
        });
    }
}