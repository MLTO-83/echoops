import Link from "next/link";
import Image from "next/image";

export default function Terms() {
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
              Terms of Service
            </h1>
            <p className="text-gray-700 dark:text-white">
              Legal agreement governing use of our platform
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
              Welcome to Portavi. Please read these Terms of Service carefully
              before using our platform. By accessing or using Portavi, you
              agree to be bound by these Terms.
            </p>

            <div className="card-neo p-6 mb-10 mt-8">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using the Portavi platform, website, and
                services (collectively, the "Services"), you agree to be bound
                by these Terms of Service. If you do not agree to all of these
                Terms, you may not access or use our Services.
              </p>
            </div>

            <div className="card-neo p-6 mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                2. Changes to Terms
              </h2>
              <p>
                We may modify these Terms at any time by posting the revised
                Terms on our website or within our Services. Your continued use
                of the Services after any such changes constitutes your
                acceptance of the new Terms.
              </p>
            </div>

            <div className="card-neo p-6 mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                3. Account Registration
              </h2>
              <p className="mb-3">
                To access most features of the Services, you must register for
                an account. When you register, you agree to:
              </p>
              <ul className="list-none pl-0 space-y-2">
                {[
                  "Provide accurate and complete information",
                  "Maintain the security of your account credentials",
                  "Immediately notify Portavi of any unauthorized use of your account",
                  "Accept responsibility for all activities that occur under your account",
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

            <div className="card-neo p-6 mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                4. Subscription and Billing
              </h2>
              <div className="space-y-4">
                {[
                  {
                    title: "4.1 Free Trial",
                    content:
                      "We may offer a limited-time free trial of our Services. At the end of the trial period, you will be automatically charged for the subscription plan you selected unless you cancel before the trial ends.",
                  },
                  {
                    title: "4.2 Subscription Plans",
                    content:
                      "We offer various subscription plans with different features and pricing. You agree to pay all fees associated with your selected plan.",
                  },
                  {
                    title: "4.3 Payment",
                    content:
                      "You agree to provide valid payment information and authorize us to charge your payment method for all fees incurred. Payments are non-refundable except as required by law or as expressly stated in these Terms.",
                  },
                  {
                    title: "4.4 Renewal",
                    content:
                      "Your subscription will automatically renew at the end of each billing cycle unless you cancel at least 24 hours before the renewal date.",
                  },
                  {
                    title: "4.5 Changes to Pricing",
                    content:
                      "We reserve the right to change our prices. If we change pricing for your subscription plan, we will notify you before the change takes effect.",
                  },
                ].map((section, i) => (
                  <div
                    key={i}
                    className="bg-background-secondary/30 dark:bg-background-secondary/20 p-4 rounded-md"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {section.title}
                    </h3>
                    <p>{section.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-neo p-6 mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                5. User Conduct
              </h2>
              <p className="mb-3">You agree not to use the Services to:</p>
              <ul className="list-none pl-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Violate any applicable laws or regulations",
                  "Infringe upon the intellectual property rights of others",
                  "Transmit any harmful code, malware, or viruses",
                  "Interfere with or disrupt the integrity of the Services",
                  "Harass, abuse, or harm another person",
                  "Collect or store personal data about other users without their consent",
                ].map((item, i) => (
                  <li
                    className="flex items-start gap-2 bg-background-secondary/30 dark:bg-background-secondary/20 p-2 rounded-md"
                    key={i}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-warning mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-neo p-6 mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                6. Third-Party Integrations
              </h2>
              <p>
                Our Services may integrate with third-party services and
                applications. Your use of such integrations is subject to both
                these Terms and any terms imposed by the third-party services.
                Portavi is not responsible for the practices, policies, or
                content of these third-party services.
              </p>
            </div>

            <div className="card-neo p-6 mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                7. Intellectual Property Rights
              </h2>
              <div className="space-y-4">
                <div className="bg-background-secondary/30 dark:bg-background-secondary/20 p-4 rounded-md">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    7.1 Portavi Content
                  </h3>
                  <p>
                    All content provided by Portavi, including but not limited
                    to text, graphics, logos, icons, images, audio clips,
                    software, and other material ("Portavi Content"), is the
                    property of Portavi or its licensors and is protected by
                    copyright, trademark, and other intellectual property laws.
                  </p>
                </div>
                <div className="bg-background-secondary/30 dark:bg-background-secondary/20 p-4 rounded-md">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    7.2 User Content
                  </h3>
                  <p>
                    You retain ownership of any content you upload to the
                    Services ("User Content"). By uploading User Content, you
                    grant Portavi a worldwide, non-exclusive, royalty-free
                    license to use, reproduce, modify, and display your User
                    Content solely for the purpose of providing the Services to
                    you.
                  </p>
                </div>
              </div>
            </div>

            <div className="card-neo p-6 mb-10 border-l-2 border-warning">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                8. Limitation of Liability
              </h2>
              <p className="bg-background-secondary/30 dark:bg-background-secondary/20 p-4 rounded-md uppercase text-sm font-medium tracking-wider">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PORTAVI, ITS
                AFFILIATES, AND THEIR RESPECTIVE OFFICERS, DIRECTORS, EMPLOYEES,
                AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF
                PROFITS, DATA, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR IN
                CONNECTION WITH THESE TERMS OR THE SERVICES, EVEN IF PORTAVI HAS
                BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
            </div>

            <div className="card-neo p-6 mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                9. Termination
              </h2>
              <p>
                We may suspend or terminate your access to the Services for any
                reason, including if we believe you have violated these Terms.
                Upon termination, your right to use the Services will
                immediately cease, and any data associated with your account may
                be deleted.
              </p>
            </div>

            <div className="card-neo p-6 mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                10. Governing Law
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance
                with the laws of Denmark, without regard to its conflict of law
                principles. Any legal action or proceeding arising out of or
                related to these Terms or the Services shall be brought
                exclusively in the courts located in Aarhus, Denmark.
              </p>
            </div>

            <div className="card-neo p-6 mb-10">
              <h2 className="text-2xl font-display font-semibold text-gray-900 dark:text-white mb-4">
                11. Contact Information
              </h2>
              <p className="mb-6">
                If you have any questions about these Terms, please contact us
                at:
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
