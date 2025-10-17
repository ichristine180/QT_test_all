import React from "react";
interface WelcomeCardProps {
  user: any;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ user }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card p-12 max-w-2xl text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <svg
            className="w-10 h-10 text-primary-900"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome to Your Dashboard!
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Hello{" "}
          <span className="font-semibold text-primary-900">{user?.email}</span>
        </p>
        <p className="text-gray-600 mb-8">
          You're successfully logged in. Your account is active and ready to
          use. More features coming soon!
        </p>
        <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
          <svg
            className="w-5 h-5 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Account Status: Active</span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;
