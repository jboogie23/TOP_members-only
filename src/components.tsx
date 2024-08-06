/** @jsxImportSource hono/jsx */
import { html } from "hono/html";

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isMember: boolean;
  isAdmin: boolean;
};

export type Message = {
  id: number;
  title: string;
  content: string;
  userId: number;
  createdAt: string;
};

type BaseLayoutProps = {
  user: User | null;
  children: any;
};

export const BaseLayout = ({ user, children }: BaseLayoutProps) => html`
  <html>
    <head>
      <title>Members Only</title>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css"
      />
    </head>
    <body>
      <nav>
        <a href="/">Home</a>
        ${user
          ? html`
              <a href="/new-message">New Message</a>
              <a href="/join-club">Join Club</a>
              <span>Welcome, ${user.firstName}!</span>
            `
          : html`
              <a href="/login">Login</a>
              <a href="/signup">Sign Up</a>
            `}
      </nav>
      ${children}
    </body>
  </html>
`;

type MessageListProps = {
  messages: Message[];
  user: User | null;
};

export const MessageList = ({ messages, user }: MessageListProps) => html`
  <div>
    ${messages.map(
      (message) => html`
        <div key="${message.id}">
          <h2>${message.title}</h2>
          <p>${message.content}</p>
          ${user && user.isMember
            ? html`<p>
                By: ${message.userId} on
                ${new Date(message.createdAt).toLocaleString()}
              </p>`
            : ""}
          ${user && user.isAdmin
            ? html`
                <form method="POST" action="/delete-message/${message.id}">
                  <button type="submit">Delete</button>
                </form>
              `
            : ""}
        </div>
      `
    )}
  </div>
`;

type FormProps = {
  error?: string;
};

export const SignupForm = ({ error }: FormProps) => html`
  <h1>Sign Up</h1>
  ${error ? html`<p style="color: red;">${error}</p>` : ""}
  <form method="POST">
    <input name="firstName" type="text" placeholder="First Name" required />
    <input name="lastName" type="text" placeholder="Last Name" required />
    <input name="email" type="email" placeholder="Email" required />
    <input name="password" type="password" placeholder="Password" required />
    <input
      name="confirmPassword"
      type="password"
      placeholder="Confirm Password"
      required
    />
    <button type="submit">Sign Up</button>
  </form>
`;

export const LoginForm = ({ error }: FormProps) => html`
  <h1>Login</h1>
  ${error ? html`<p style="color: red;">${error}</p>` : ""}
  <form method="POST">
    <input name="email" type="email" placeholder="Email" required />
    <input name="password" type="password" placeholder="Password" required />
    <button type="submit">Login</button>
  </form>
`;

export const JoinClubForm = ({ error }: FormProps) => html`
  <h1>Join the Club</h1>
  ${error ? html`<p style="color: red;">${error}</p>` : ""}
  <form method="POST">
    <input
      name="secretCode"
      type="password"
      placeholder="Secret Code"
      required
    />
    <button type="submit">Join</button>
  </form>
`;

export const NewMessageForm = ({ error }: FormProps) => html`
  <h1>New Message</h1>
  ${error ? html`<p style="color: red;">${error}</p>` : ""}
  <form method="POST">
    <input name="title" type="text" placeholder="Title" required />
    <textarea name="content" placeholder="Content" required></textarea>
    <button type="submit">Create Message</button>
  </form>
`;
