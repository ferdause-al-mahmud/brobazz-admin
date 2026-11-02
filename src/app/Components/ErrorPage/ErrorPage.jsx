// components/ErrorPage.js
"use client"
import { useRouter } from 'next/navigation';
import React from 'react';

const ErrorPage = ({ message }) => {
    const Router = useRouter();

    const handleGoHome = () => {
        Router.push('/');  // Redirects to the home page
    };

    return (
        <div className="h-[100vh] flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="bg-white shadow-md rounded-lg p-8 max-w-md text-center">
                <h1 className="text-4xl font-bold text-black mb-4">Access Denied</h1>
                <p className="text-lg text-gray-600 mb-8">{message}</p>
                <button
                    onClick={handleGoHome}
                    className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-all duration-300"
                >
                    Go to Home
                </button>
            </div>
        </div>
    );
};

export default ErrorPage;
