"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    if (error) {
      console.error("Error caught in Error Boundary:", error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-5xl font-bold text-gray-800 mb-4">404 NOT FOUND!</h1>
      <p className="text-lg text-gray-600 mb-8">
        We could no find the page. Please try again or go Home.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 mb-4 text-white bg-blue-500 rounded hover:bg-blue-600"
      >
        Try Again
      </button>
      <Link href="/">
        <p className="text-blue-500 hover:underline">Go back to Home</p>
      </Link>
    </div>
  );
}
