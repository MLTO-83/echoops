"use client";

import { useState } from "react";
import { useSession } from "@/app/components/FirebaseAuthProvider";

export default function TestEmailPage() {
  const { data: session } = useSession();
  const [emailResult, setEmailResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [recipient, setRecipient] = useState<string>("");
  const [subject, setSubject] = useState<string>("Test email from Portavi");
  const [message, setMessage] = useState<string>(
    "This is a test email sent from the Portavi platform using Resend."
  );

  // Send verification email to current user
  const sendVerificationEmail = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/email/resend-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setEmailResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error sending verification email:", error);
      setEmailResult(
        JSON.stringify({ error: "Failed to send verification email" }, null, 2)
      );
    } finally {
      setLoading(false);
    }
  };

  // Send custom email
  const sendCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipient,
          subject,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hello from Portavi!</h2>
            <p>${message}</p>
            <p>Best regards,<br/>The Portavi Team</p>
          </div>`,
        }),
      });

      const data = await response.json();
      setEmailResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error sending custom email:", error);
      setEmailResult(
        JSON.stringify({ error: "Failed to send custom email" }, null, 2)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Email Testing Page</h1>

      {!session ? (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded mb-4">
          Please sign in to use email features
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">
                Send Verification Email
              </h2>
              <p className="mb-4">
                Send a verification email to your account ({session.user?.email}
                )
              </p>
              <button
                onClick={sendVerificationEmail}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? "Sending..." : "Send Verification Email"}
              </button>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Send Custom Email</h2>
              <form onSubmit={sendCustomEmail}>
                <div className="mb-4">
                  <label htmlFor="recipient" className="block mb-1">
                    Recipient Email:
                  </label>
                  <input
                    type="email"
                    id="recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="subject" className="block mb-1">
                    Subject:
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="message" className="block mb-1">
                    Message:
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-2 border rounded"
                    rows={4}
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-400"
                >
                  {loading ? "Sending..." : "Send Custom Email"}
                </button>
              </form>
            </div>
          </div>

          {emailResult && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Result:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto">
                {emailResult}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
