import Link from "next/link";
import Image from "next/image";

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
      {/* Floating decoration elements */}
      <div className="fixed top-20 left-10 w-24 h-24 bg-primary/20 rounded-full animate-float blur-xl"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl"></div>

      <div className="w-full max-w-6xl space-y-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
          <div className="space-y-1">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-gray-700 dark:text-white">
              How we handle and protect your data
            </p>
          </div>

          <Link
            href="/"
            className="button-neo border-primary dark:border-primary text-gray-900 dark:text-white hover:bg-primary/10 
                     transition-all duration-300 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 transform transition-transform duration-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Home</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="card-spatial relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/2"></div>

          <div className="prose prose-lg max-w-none relative z-10 text-gray-700 dark:text-white">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Last updated: April 20, 2025
            </p>

            <p className="text-lg">
              At Portavi, we take your privacy seriously. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you use our platform.
            </p>

            <div className="mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                Information We Collect
              </h2>

              <div className="card-neo p-6 mb-6">
                <h3 className="text-xl font-display font-medium text-gray-900 dark:text-white mb-3">
                  Personal Information
                </h3>
                <p className="mb-3">
                  We may collect personal information that you voluntarily
                  provide to us when you:
                </p>
                <ul className="list-none pl-0 space-y-2">
                  {[
                    "Register for an account",
                    "Sign up for our newsletter",
                    "Contact our support team",
                    "Participate in surveys or promotions",
                  ].map((item, i) => (
                    <li className="flex items-start gap-3" key={i}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4">
                  This information may include your name, email address, company
                  name, and job title.
                </p>
              </div>

              <div className="card-neo p-6">
                <h3 className="text-xl font-display font-medium text-gray-900 dark:text-white mb-3">
                  Usage Data
                </h3>
                <p className="mb-3">
                  We automatically collect certain information when you visit,
                  use, or navigate our platform. This information may include:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "IP address",
                    "Browser type and version",
                    "Device type",
                    "Operating system",
                    "Usage patterns and preferences",
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-background-secondary/30 dark:bg-background-secondary/20 p-2 rounded-md"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                How We Use Your Information
              </h2>
              <div className="card-neo p-6">
                <p className="mb-3">
                  We use the information we collect for various purposes,
                  including:
                </p>
                <ul className="list-none pl-0 space-y-2">
                  {[
                    "Providing and maintaining our platform",
                    "Improving and personalizing your user experience",
                    "Responding to your requests and inquiries",
                    "Sending administrative information, such as updates or security alerts",
                    "Marketing and promotional communications (with your consent)",
                    "Analyzing usage trends and patterns",
                  ].map((item, i) => (
                    <li className="flex items-start gap-3" key={i}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                Third-Party Integrations
              </h2>
              <div className="card-neo p-6">
                <p className="mb-4">
                  Portavi integrates with third-party services such as Azure
                  DevOps, GitHub, and other development tools. When you connect
                  these services to your Portavi account:
                </p>
                <ul className="list-none pl-0 space-y-2">
                  {[
                    "We only access the information necessary to provide our services",
                    "We adhere to each service's API terms and conditions",
                    "You can revoke our access to these services at any time",
                  ].map((item, i) => (
                    <li className="flex items-start gap-3" key={i}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4">
                  We recommend reviewing the privacy policies of these
                  third-party services for more information on how they handle
                  your data.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                Data Security
              </h2>
              <div className="card-neo p-6">
                <p className="mb-3">
                  We implement appropriate technical and organizational measures
                  to protect your personal information, including:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Encryption",
                      desc: "Data is encrypted in transit and at rest",
                    },
                    {
                      title: "Security Audits",
                      desc: "Regular assessments and vulnerability testing",
                    },
                    {
                      title: "Access Controls",
                      desc: "Strong authentication and authorization",
                    },
                    {
                      title: "Staff Training",
                      desc: "Ongoing education on data protection",
                    },
                  ].map((item, i) => (
                    <div
                      className="bg-background-secondary/30 dark:bg-background-secondary/20 p-3 rounded-md"
                      key={i}
                    >
                      <div className="font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-primary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        {item.title}
                      </div>
                      <div className="text-sm">{item.desc}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm bg-background/70 dark:bg-background/30 p-3 rounded-md border-l-2 border-warning">
                  <strong>Note:</strong> While we strive to protect your
                  information, no method of transmission or storage is 100%
                  secure. We cannot guarantee absolute security of your data.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                Your Rights and Choices
              </h2>
              <div className="card-neo p-6">
                <p className="mb-3">
                  Depending on your location, you may have certain rights
                  regarding your personal information:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {[
                    "Access to your personal data",
                    "Correction of inaccurate information",
                    "Deletion of your personal data",
                    "Restriction of processing",
                    "Data portability",
                    "Objection to processing",
                  ].map((right, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-background-secondary/30 dark:bg-background-secondary/20 p-2 rounded-md"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      <span>{right}</span>
                    </div>
                  ))}
                </div>
                <p>
                  To exercise these rights, please contact us at{" "}
                  <span className="text-primary">privacy@portavi.com</span>.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card-neo p-6">
                <h2 className="text-xl font-display font-semibold text-gray-900 dark:text-white mb-2">
                  Cookies and Similar Technologies
                </h2>
                <p>
                  We use cookies and similar tracking technologies to enhance
                  your experience on our platform. You can set your browser to
                  refuse all cookies or to indicate when a cookie is being sent.
                </p>
              </div>

              <div className="card-neo p-6">
                <h2 className="text-xl font-display font-semibold text-gray-900 dark:text-white mb-2">
                  Changes to This Privacy Policy
                </h2>
                <p>
                  We may update this Privacy Policy from time to time. We will
                  notify you of any changes by posting the new Privacy Policy on
                  this page and updating the "Last updated" date.
                </p>
              </div>

              <div className="card-neo p-6">
                <h2 className="text-xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                  Contact Us
                </h2>
                <p className="mb-6">
                  If you have any questions about this Privacy Policy, please
                  contact us at:
                </p>
                <div className="bg-background-secondary/50 dark:bg-background-secondary/20 p-6 rounded-lg border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Email: </span>
                    <a
                      href="mailto:legal@portavi.eu"
                      className="text-primary hover:underline"
                    >
                      legal@portavi.eu
                    </a>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>Address: Carl Jensens Vej 29</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>City: Aarhus, Denmark</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-auto pt-8">
        <div className="border-t border-border/30 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-500 dark:text-gray-400 mb-4 md:mb-0">
              © {new Date().getFullYear()} Portavi. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link
                href="/about"
                className="text-gray-500 dark:text-gray-400 hover:text-primary"
              >
                About
              </Link>
              <Link
                href="/how-to"
                className="text-gray-500 dark:text-gray-400 hover:text-primary"
              >
                How To
              </Link>
              <Link
                href="/privacy"
                className="text-gray-500 dark:text-gray-400 hover:text-primary"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-gray-500 dark:text-gray-400 hover:text-primary"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
