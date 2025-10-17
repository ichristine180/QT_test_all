import React from "react";

interface DashboardHeaderProps {
  user?: any;
  onLogout: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  onLogout,
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-blue-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Left section */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-600">
              Welcome back,{" "}
              <span className="font-medium text-primary-900">
                {user?.email ?? "Guest"}
              </span>
            </p>
          </div>

          {/* Right section - Logout button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white/70 hover:bg-white/90 border border-gray-300 rounded-lg transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
