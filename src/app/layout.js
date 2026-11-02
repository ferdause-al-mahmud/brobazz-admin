import { Roboto, Assistant } from "next/font/google";
import "./globals.css";
import AuthProvider from "./services/AuthProvider";
import { Toaster } from "react-hot-toast";

// Load Assistant font
const assistant = Assistant({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

// Load Roboto font if needed
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Brobazz Admin",
    template: "%s | Brobazz Admin",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      </head>

      <body
        className={`${assistant.className} bg-[#f3f3f3]`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <main className="">{children}</main>
          <Toaster position="top-right" reverseOrder={false} />
        </AuthProvider>
      </body>
    </html>
  );
}
