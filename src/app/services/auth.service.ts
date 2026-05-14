import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { Router } from "@angular/router";
import { environment } from "@environments/environment";
import { AuthResponse, User, SessionEntry } from "../models";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private sessionsSubject = new BehaviorSubject<SessionEntry[]>([]);
  /** Emits the full list of active sessions whenever it changes. */
  public sessions$ = this.sessionsSubject.asObservable();

  // Storage keys
  private readonly sessionsKey = "pos_sessions";
  private readonly activeSessionKey = "pos_active_session";
  /** @deprecated Kept in sync with active session for backward compat (interceptor etc.). */
  private readonly tokenKey = "pos_token";
  /** @deprecated Kept in sync with active session for backward compat. */
  private readonly userKey = "pos_user";

  private sessions: SessionEntry[] = [];
  private activeUserId: string | null = null;

  constructor() {
    this.loadStoredSessions();
  }

  // ─── Session Management ──────────────────────────────────────────────────

  /**
   * Adds a new session or updates the token for an existing session.
   * Sets the provided user as the active session.
   */
  addSession(token: string, user: User): void {
    const userId = user.id ?? (user as any)._id ?? user.username;
    const existing = this.sessions.findIndex(
      (s) => (s.user.id ?? (s.user as any)._id ?? s.user.username) === userId
    );
    const entry: SessionEntry = { token, user };
    if (existing >= 0) {
      this.sessions[existing] = entry;
    } else {
      this.sessions.push(entry);
    }
    this.persistSessions();
    this.activateSession(userId);
  }

  /**
   * Returns a shallow copy of all active sessions.
   */
  getSessions(): SessionEntry[] {
    return [...this.sessions];
  }

  /**
   * Switches the active user. Does nothing if userId is not found.
   */
  switchSession(userId: string): void {
    const found = this.sessions.find(
      (s) => (s.user.id ?? (s.user as any)._id ?? s.user.username) === userId
    );
    if (!found) return;
    this.activateSession(userId);
  }

  /**
   * Removes a session. If it was the active session, switches to the next
   * available one. If no sessions remain, redirects to /login.
   */
  removeSession(userId: string): void {
    const idx = this.sessions.findIndex(
      (s) => (s.user.id ?? (s.user as any)._id ?? s.user.username) === userId
    );
    if (idx === -1) return;

    const wasActive = this.activeUserId === userId;
    this.sessions.splice(idx, 1);
    this.persistSessions();

    if (wasActive) {
      if (this.sessions.length > 0) {
        const nextId =
          this.sessions[0].user.id ??
          (this.sessions[0].user as any)._id ??
          this.sessions[0].user.username;
        this.activateSession(nextId);
      } else {
        this.activeUserId = null;
        localStorage.removeItem(this.activeSessionKey);
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        this.currentUserSubject.next(null);
        this.router.navigate(["/login"]);
      }
    }
  }

  // ─── Auth Actions ────────────────────────────────────────────────────────

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
        username,
        password,
      })
      .pipe(
        tap((response) => {
          this.addSession(response.token, response.user);
        })
      );
  }

  loginWithQr(qrData: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/qr-login`, { qrData })
      .pipe(
        tap((response) => {
          this.addSession(response.token, response.user);
        })
      );
  }

  register(userData: Partial<User>): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, userData)
      .pipe(
        tap((response) => {
          this.addSession(response.token, response.user);
        })
      );
  }

  /**
   * Removes the current user's session. If other sessions remain, switches to
   * the next one. If this is the last session, navigates to /login.
   */
  logout(): void {
    const current = this.getCurrentUser();
    const id = current?.id ?? (current as any)?._id ?? current?.username;
    if (id) {
      this.removeSession(id);
    } else {
      // No active user — force clean state
      this.sessions = [];
      localStorage.removeItem(this.sessionsKey);
      localStorage.removeItem(this.activeSessionKey);
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      this.currentUserSubject.next(null);
      this.router.navigate(["/login"]);
    }
  }

  // ─── Accessors ───────────────────────────────────────────────────────────

  /** Returns the JWT for the currently active session (backward compatible). */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === "admin") return true;
    return user.permissions?.includes(permission) ?? false;
  }

  hasRole(...roles: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    return roles.includes(user.role);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private activateSession(userId: string): void {
    this.activeUserId = userId;
    localStorage.setItem(this.activeSessionKey, userId);

    const session = this.sessions.find(
      (s) => (s.user.id ?? (s.user as any)._id ?? s.user.username) === userId
    );
    if (session) {
      // Keep backward-compat keys in sync for the interceptor and guards
      localStorage.setItem(this.tokenKey, session.token);
      localStorage.setItem(this.userKey, JSON.stringify(session.user));
      this.currentUserSubject.next(session.user);
    }
  }

  private persistSessions(): void {
    localStorage.setItem(this.sessionsKey, JSON.stringify(this.sessions));
    this.sessionsSubject.next([...this.sessions]);
  }

  private loadStoredSessions(): void {
    const sessionsStr = localStorage.getItem(this.sessionsKey);

    if (sessionsStr) {
      try {
        this.sessions = JSON.parse(sessionsStr) as SessionEntry[];
        this.sessionsSubject.next([...this.sessions]);
        const activeId = localStorage.getItem(this.activeSessionKey);
        const active =
          this.sessions.find(
            (s) =>
              (s.user.id ?? (s.user as any)._id ?? s.user.username) === activeId
          ) ?? this.sessions[0];

        if (active) {
          const id =
            active.user.id ?? (active.user as any)._id ?? active.user.username;
          this.activeUserId = id;
          // Sync compat keys
          localStorage.setItem(this.tokenKey, active.token);
          localStorage.setItem(this.userKey, JSON.stringify(active.user));
          this.currentUserSubject.next(active.user);
        }
      } catch {
        this.sessions = [];
        localStorage.clear();
      }
      return;
    }

    // Migrate from legacy single-session storage format
    const token = localStorage.getItem(this.tokenKey);
    const userStr = localStorage.getItem(this.userKey);
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        this.sessions = [{ token, user }];
        this.sessionsSubject.next([...this.sessions]);
        const id = user.id ?? (user as any)._id ?? user.username;
        this.activeUserId = id;
        localStorage.setItem(this.sessionsKey, JSON.stringify(this.sessions));
        localStorage.setItem(this.activeSessionKey, id);
        this.currentUserSubject.next(user);
      } catch {
        // Corrupt legacy data — force clean state
        this.sessions = [];
        localStorage.clear();
        this.currentUserSubject.next(null);
      }
    }
  }
}
