"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { userAPI } from "@/lib/api";
import protobuf from "protobufjs";
import { verifyEmailSignature } from "@/lib/crypto";
import toast, { Toaster } from "react-hot-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Stats {
  date: string;
  count: number;
}

interface User {
  id: number;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  emailHash: string;
  emailSignature: string;
  verified?: boolean;
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    email: "",
    password: "",
    role: "user",
  });
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    id: 0,
    email: "",
    role: "user",
  });
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "activate" | "deactivate";
    userId: number;
    userEmail: string;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      loadData();
      loadUsers();
    } else if (isAuthenticated) {
      setLoadingData(false);
      setLoadingUsers(false);
    }
  }, [isAuthenticated, user]);

  const loadData = async () => {
    try {
      const statsData = await userAPI.getStats();
      setStats(statsData.data);
    } catch (error) {
    } finally {
      setLoadingData(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setUsersError(null);
      const publicKeyResponse = await userAPI.getPublicKey();
      const publicKey = publicKeyResponse.publicKey;
      const buffer = await userAPI.exportUsers();
      const root = await protobuf.load("/user.proto");
      const UserList = root.lookupType("user.UserList");
      const message = UserList.decode(new Uint8Array(buffer));
      const userList = UserList.toObject(message, {
        longs: Number,
        enums: String,
        bytes: String,
      });
      const usersWithVerification = await Promise.all(
        (userList.users || []).map(async (u: any) => {
          let verified = false;
          if (u.emailHash && u.emailSignature) {
            try {
              verified = await verifyEmailSignature(
                u.emailHash,
                u.emailSignature,
                publicKey
              );
            } catch (error) {
              console.error(
                `Failed to verify signature for user ${u.id}:`,
                error
              );
            }
          }

          return {
            ...u,
            verified,
          };
        })
      );
      const validUsers = usersWithVerification.filter((u) => u.verified);
      setUsers(validUsers);
    } catch (error: any) {
      console.error("Failed to load users:", error);
      setUsersError(error.response?.data?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    setAddUserError(null);

    try {
      await userAPI.create(addUserForm);
      setAddUserForm({ email: "", password: "", role: "user" });
      setShowAddUserModal(false);
      toast.success("User created successfully!");
      await loadUsers();
    } catch (error: any) {
      setAddUserError(error.response?.data?.message || "Failed to create user");
    } finally {
      setAddingUser(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditingUser(true);
    setEditUserError(null);

    try {
      await userAPI.update(editUserForm.id, {
        email: editUserForm.email,
        role: editUserForm.role,
      });
      setEditUserForm({ id: 0, email: "", role: "user" });
      setShowEditUserModal(false);
      toast.success("User updated successfully!");
      await loadUsers();
    } catch (error: any) {
      setEditUserError(error.response?.data?.message || "Failed to update user");
    } finally {
      setEditingUser(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setIsProcessingAction(true);

    try {
      const { type, userId, userEmail } = confirmAction;

      switch (type) {
        case "delete":
          await userAPI.delete(userId);
          toast.success(`User ${userEmail} deleted successfully!`);
          break;
        case "activate":
          await userAPI.activate(userId);
          toast.success(`User ${userEmail} activated successfully!`);
          break;
        case "deactivate":
          await userAPI.deactivate(userId);
          toast.success(`User ${userEmail} deactivated successfully!`);
          break;
      }

      setShowConfirmModal(false);
      setConfirmAction(null);
      await loadUsers();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || `Failed to ${confirmAction.type} user`
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteUser = (userId: number, userEmail: string) => {
    setConfirmAction({ type: "delete", userId, userEmail });
    setShowConfirmModal(true);
  };

  const handleActivateUser = (userId: number, userEmail: string) => {
    setConfirmAction({ type: "activate", userId, userEmail });
    setShowConfirmModal(true);
  };

  const handleDeactivateUser = (userId: number, userEmail: string) => {
    setConfirmAction({ type: "deactivate", userId, userEmail });
    setShowConfirmModal(true);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white/70 hover:bg-white/90 border border-gray-300 rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === "admin" ? (
          <>
            <div className="mb-4">
              <div className="card p-3 h-25">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      User Growth
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      New user registrations over the last 7 days
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-primary-100 text-primary-900 rounded-full text-sm font-medium">
                    Last 7 Days
                  </div>
                </div>
                {loadingData ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
                  </div>
                ) : (
                  <>
                    {stats && stats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart
                          data={stats}
                          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorCount"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#001433"
                                stopOpacity={0.1}
                              />
                              <stop
                                offset="95%"
                                stopColor="#001433"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="date"
                            stroke="#6b7280"
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              });
                            }}
                          />
                          <YAxis
                            stroke="#6b7280"
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              border: "1px solid #e5e7eb",
                              borderRadius: "0.5rem",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              });
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#001433"
                            strokeWidth={3}
                            dot={{
                              fill: "#001433",
                              r: 5,
                              strokeWidth: 2,
                              stroke: "#fff",
                            }}
                            activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                            fill="url(#colorCount)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-gray-500">
                            No data available for the chart
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            Stats will appear once users are registered
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="mt-8">
              <div className="card p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Verified Users
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Users with valid email signatures
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-900 hover:bg-primary-800 rounded-lg transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                      Add User
                    </button>
                    <button
                      onClick={loadUsers}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-900 focus:border-transparent"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg
                          className="w-5 h-5 text-gray-400 hover:text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Showing {currentUsers.length} of {filteredUsers.length} users
                    {searchQuery && ` matching "${searchQuery}"`}
                  </p>
                </div>

                {loadingUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
                  </div>
                ) : usersError ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                      <svg
                        className="w-8 h-8 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6">{usersError}</p>
                    <button
                      onClick={loadUsers}
                      className="px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      {searchQuery ? "No Users Found" : "No Verified Users"}
                    </h3>
                    <p className="text-gray-500">
                      {searchQuery
                        ? `No users match your search "${searchQuery}"`
                        : "No users with valid signatures found."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              #
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Email
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Role
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Registered At
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentUsers.map((u, i) => (
                          <tr
                            key={u.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-4 text-gray-800">
                              {indexOfFirstItem + i + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-800">{u.email}</span>
                                {u.verified && (
                                  <span title="Verified">
                                    <svg
                                      className="w-5 h-5 text-green-500 flex-shrink-0"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                  u.role === "admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                  u.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-sm">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditUserForm({
                                      id: u.id,
                                      email: u.email,
                                      role: u.role,
                                    });
                                    setShowEditUserModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-900 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                                  title="Edit user"
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                  Edit
                                </button>
                                {u.status === "active" ? (
                                  <button
                                    onClick={() =>
                                      handleDeactivateUser(u.id, u.email)
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-700 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                                    title="Deactivate user"
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
                                        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleActivateUser(u.id, u.email)
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                    title="Activate user"
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
                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    Activate
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Delete user"
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                      <div className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                          Previous
                        </button>

                        {/* Page numbers */}
                        <div className="flex gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((page) => {
                              // Show first page, last page, current page, and pages around current
                              return (
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 1
                              );
                            })
                            .map((page, idx, arr) => {
                              // Add ellipsis if there's a gap
                              const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                              return (
                                <div key={page} className="flex items-center gap-1">
                                  {showEllipsisBefore && (
                                    <span className="px-2 py-2 text-gray-400">...</span>
                                  )}
                                  <button
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                      currentPage === page
                                        ? "bg-primary-900 text-white"
                                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </div>
                              );
                            })}
                        </div>

                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
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
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Regular User View */
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
                <span className="font-semibold text-primary-900">
                  {user?.email}
                </span>
              </p>
              <p className="text-gray-600 mb-8">
                You're successfully logged in. Your account is active and ready
                to use. More features coming soon!
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
        )}
      </main>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Add New User</h2>
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setAddUserError(null);
                  setAddUserForm({ email: "", password: "", role: "user" });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {addUserError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{addUserError}</p>
              </div>
            )}

            <form onSubmit={handleAddUser}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={addUserForm.email}
                    onChange={(e) =>
                      setAddUserForm({ ...addUserForm, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-900 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={addUserForm.password}
                    onChange={(e) =>
                      setAddUserForm({
                        ...addUserForm,
                        password: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-900 focus:border-transparent"
                    placeholder="Min 6 characters"
                  />
                </div>

                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Role
                  </label>
                  <select
                    id="role"
                    value={addUserForm.role}
                    onChange={(e) =>
                      setAddUserForm({ ...addUserForm, role: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-900 focus:border-transparent"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setAddUserError(null);
                    setAddUserForm({ email: "", password: "", role: "user" });
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={addingUser}
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-900 hover:bg-primary-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingUser ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Add User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Edit User</h2>
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditUserError(null);
                  setEditUserForm({ id: 0, email: "", role: "user" });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {editUserError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{editUserError}</p>
              </div>
            )}

            <form onSubmit={handleEditUser}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    required
                    value={editUserForm.email}
                    onChange={(e) =>
                      setEditUserForm({ ...editUserForm, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-900 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-role"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Role
                  </label>
                  <select
                    id="edit-role"
                    value={editUserForm.role}
                    onChange={(e) =>
                      setEditUserForm({ ...editUserForm, role: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-900 focus:border-transparent"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUserModal(false);
                    setEditUserError(null);
                    setEditUserForm({ id: 0, email: "", role: "user" });
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={editingUser}
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingUser}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-900 hover:bg-primary-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingUser ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Update User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-6">
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                  confirmAction.type === "delete"
                    ? "bg-red-100"
                    : confirmAction.type === "deactivate"
                    ? "bg-orange-100"
                    : "bg-green-100"
                }`}
              >
                <svg
                  className={`w-8 h-8 ${
                    confirmAction.type === "delete"
                      ? "text-red-600"
                      : confirmAction.type === "deactivate"
                      ? "text-orange-600"
                      : "text-green-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {confirmAction.type === "delete" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  )}
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
              {confirmAction.type === "delete"
                ? "Delete User"
                : confirmAction.type === "deactivate"
                ? "Deactivate User"
                : "Activate User"}
            </h2>

            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to {confirmAction.type}{" "}
              <span className="font-semibold">{confirmAction.userEmail}</span>?
              {confirmAction.type === "delete" &&
                " This action cannot be undone."}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isProcessingAction}
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isProcessingAction}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmAction.type === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirmAction.type === "deactivate"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isProcessingAction ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {confirmAction.type === "delete"
                      ? "Delete"
                      : confirmAction.type === "deactivate"
                      ? "Deactivate"
                      : "Activate"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
