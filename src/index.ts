import { Hono } from "hono";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import {
  BaseLayout,
  MessageList,
  SignupForm,
  LoginForm,
  JoinClubForm,
  NewMessageForm,
  User,
  Message,
} from "./components";

type Bindings = {
  DB: D1Database;
};

type Session = {
  userId: number;
};

type Variables = {
  user: User | null;
  session: Session | null;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware for authentication
app.use("*", async (c, next) => {
  const session = c.get("session");
  let user: User | null = null;

  if (session && session.userId) {
    user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(session.userId)
      .first<User | null>();
  }

  c.set("user", user);
  await next();
});

// Routes
app.get("/", async (c) => {
  const messages = await c.env.DB.prepare(
    "SELECT * FROM messages ORDER BY createdAt DESC"
  ).all<Message>();
  const user = c.get("user");

  return c.html(
    BaseLayout({
      user,
      children: MessageList({ messages: messages.results, user }),
    })
  );
});

app.get("/signup", (c) => {
  return c.html(
    BaseLayout({ user: null, children: SignupForm({ error: undefined }) })
  );
});

app.post("/signup", async (c) => {
  const body = await c.req.parseBody();
  const schema = z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      confirmPassword: z.string().min(6),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

  try {
    const data = schema.parse(body);
    const hashedPassword = await hash(data.password, 10);
    const result = await c.env.DB.prepare(
      "INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)"
    )
      .bind(data.firstName, data.lastName, data.email, hashedPassword)
      .run();

    if (result.success) {
      // Get the last inserted ID from the meta property
      const lastInsertId = result.meta?.last_row_id;
      if (lastInsertId) {
        // Set session after successful signup
        c.set("session", { userId: Number(lastInsertId) });
        return c.redirect("/");
      } else {
        throw new Error("Failed to get last inserted ID");
      }
    } else {
      throw new Error("Failed to create user");
    }
  } catch (error) {
    return c.html(SignupForm({ error: (error as Error).message }));
  }
});

app.get("/login", (c) => {
  return c.html(
    BaseLayout({ user: null, children: LoginForm({ error: undefined }) })
  );
});

app.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const schema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  try {
    const data = schema.parse(body);
    const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
      .bind(data.email)
      .first<User | null>();
    if (!user || !(await compare(data.password, user.password))) {
      throw new Error("Invalid email or password");
    }
    // Set session
    c.set("session", { userId: user.id });
    return c.redirect("/");
  } catch (error) {
    return c.html(
      BaseLayout({
        user: null,
        children: LoginForm({ error: (error as Error).message }),
      })
    );
  }
});

app.get("/join-club", (c) => {
  return c.html(
    BaseLayout({
      user: c.get("user"),
      children: JoinClubForm({ error: undefined }),
    })
  );
});

app.post("/join-club", async (c) => {
  const body = await c.req.parseBody();
  const user = c.get("user");
  const secretCode = "supersecret"; // In a real app, this should be stored securely

  if (user && body.secretCode === secretCode) {
    await c.env.DB.prepare("UPDATE users SET isMember = true WHERE id = ?")
      .bind(user.id)
      .run();
    return c.redirect("/");
  } else {
    return c.html(
      BaseLayout({
        user,
        children: JoinClubForm({ error: "Invalid secret code" }),
      })
    );
  }
});

app.get("/new-message", (c) => {
  const user = c.get("user");
  if (!user) return c.redirect("/login");
  return c.html(
    BaseLayout({ user, children: NewMessageForm({ error: undefined }) })
  );
});

app.post("/new-message", async (c) => {
  const user = c.get("user");
  if (!user) return c.redirect("/login");

  const body = await c.req.parseBody();
  const schema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
  });

  try {
    const data = schema.parse(body);
    await c.env.DB.prepare(
      "INSERT INTO messages (title, content, userId) VALUES (?, ?, ?)"
    )
      .bind(data.title, data.content, user.id)
      .run();
    return c.redirect("/");
  } catch (error) {
    return c.html(
      BaseLayout({
        user,
        children: NewMessageForm({ error: (error as Error).message }),
      })
    );
  }
});

app.post("/delete-message/:id", async (c) => {
  const user = c.get("user");
  if (!user || !user.isAdmin) return c.redirect("/");

  const messageId = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM messages WHERE id = ?")
    .bind(messageId)
    .run();
  return c.redirect("/");
});

export default app;
