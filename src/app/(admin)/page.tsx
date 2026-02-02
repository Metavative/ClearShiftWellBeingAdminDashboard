"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function Ecommerce() {
  const router = useRouter();
  return (
      <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
            <p className="text-gray-600">
                Welcome! Use the sidebar to manage your organisation/admins domains registration and data.
            </p>
            <button
                onClick={() => router.push("/register-domains")}
                className="rounded-lg bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
            >
                Go to Domain Management
            </button>
        </div>
  );
}
