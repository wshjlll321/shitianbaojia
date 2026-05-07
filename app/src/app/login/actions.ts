"use server";

import { signIn } from "@/lib/auth";
import { AuthError, CredentialsSignin } from "next-auth";

/** next-auth 与直连 @auth/core 可能各有一份类定义，instanceof 不可靠，用 type 字符串判断 */
function authErrorType(error: unknown): string | undefined {
  if (error instanceof AuthError) return error.type;
  if (typeof error === "object" && error !== null && "type" in error) {
    const t = (error as { type: unknown }).type;
    return typeof t === "string" ? t : undefined;
  }
  return undefined;
}

function authErrorCause(error: unknown): unknown {
  if (typeof error === "object" && error !== null && "cause" in error) {
    return (error as { cause: unknown }).cause;
  }
  return undefined;
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/sales",
    });
  } catch (error) {
    const type = authErrorType(error);

    if (type === "CredentialsSignin" || error instanceof CredentialsSignin) {
      return "邮箱或密码不正确，或账号已被禁用。";
    }
    if (type === "CallbackRouteError") {
      console.error("[login] CallbackRouteError cause:", authErrorCause(error) ?? error);
      return "登录服务异常（常见原因：数据库不可用或未初始化）。请在项目 app 目录执行 npx prisma db seed，并确认始终在同一目录下启动 npm run dev。仍失败请查看运行 next 的终端报错。";
    }
    if (type === "MissingSecret") {
      return "服务器未配置 AUTH_SECRET，无法完成登录。请在环境变量中设置 AUTH_SECRET 后重启服务。";
    }
    if (error instanceof AuthError || type) {
      console.error("[login] AuthError", type, authErrorCause(error) ?? error);
      return type
        ? `登录失败（${type}）。请稍后重试或联系管理员。`
        : "登录失败，请稍后重试或联系管理员。";
    }
    throw error;
  }
}
