import React from "react";
import { Shield, Lock, Home } from "lucide-react";
import Link from "next/link";

const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          {/* Icon container with animation */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all duration-300">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
                <Lock className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Access Denied
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-orange-500 mx-auto rounded-full"></div>
            </div>

            <p className="text-gray-300 text-lg leading-relaxed">
              Sorry, you don&apos;t have permission to access this page. Please
              contact your administrator if you believe this is an error.
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Link
                href="/"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
              {/* <button className="flex-1 bg-white/10 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transform hover:scale-105 transition-all duration-200 border border-white/20 flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button> */}
            </div>

            {/* Additional info */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-gray-400 text-sm">
                Error Code: <span className="font-mono text-red-400">403</span>
              </p>
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute -z-10 top-0 left-0 w-full h-full">
          <div className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
          <div className="absolute bottom-8 left-8 w-1 h-1 bg-purple-400/50 rounded-full animate-ping delay-300"></div>
          <div className="absolute top-1/3 left-4 w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-ping delay-700"></div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
