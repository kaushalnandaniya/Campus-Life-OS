import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

async function refreshAccessToken(token: any) {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error("Error refreshing access token", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: any = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      if (email.endsWith('.ac.in')) {
        return true;
      }

      // Check if it's a linked account
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data } = await supabase
        .from('connected_accounts')
        .select('user_email')
        .eq('account_email', email)
        .single();

      if (data && data.user_email) {
        return true;
      }

      // If not .ac.in and not linked, reject
      return "/?error=AccessDenied";
    },
    async jwt({ token, account, user }: any) {
      if (account && user) {
        // Initial sign in
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
        
        const email = user.email.toLowerCase();
        let primaryEmail = email;

        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        if (!email.endsWith('.ac.in')) {
          const { data } = await supabase
            .from('connected_accounts')
            .select('user_email')
            .eq('account_email', email)
            .single();

          if (data && data.user_email) {
            primaryEmail = data.user_email;
          }
        }

        token.primaryEmail = primaryEmail;
        token.originalEmail = email;
        
        // Save to Supabase Token Vault
        if (email && account.access_token) {
          await supabase.from('connected_accounts').upsert({
            user_email: primaryEmail,
            account_email: email,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: token.accessTokenExpires
          }, { onConflict: 'user_email, account_email' });
        }
        
        return token;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      const refreshedToken = await refreshAccessToken(token);
      
      // Update the vault with the new access token
      if (refreshedToken.originalEmail && refreshedToken.accessToken) {
         const { createClient } = await import('@supabase/supabase-js');
         const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
         const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
         const supabase = createClient(supabaseUrl, supabaseAnonKey);

         await supabase.from('connected_accounts').update({
           access_token: refreshedToken.accessToken,
           refresh_token: refreshedToken.refreshToken,
           expires_at: refreshedToken.accessTokenExpires
         }).match({ user_email: refreshedToken.primaryEmail, account_email: refreshedToken.originalEmail });
      }
      
      return refreshedToken;
    },
    async session({ session, token }: any) {
      if (token.primaryEmail && session.user) {
        session.user.email = token.primaryEmail;
      }
      // Pass access token and error to client session
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
