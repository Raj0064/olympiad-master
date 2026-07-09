import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiEyeOff } from "react-icons/fi";
import { BsEye } from "react-icons/bs";

const Register = () => {
  const { register, currentUser, userProfile } = useAuth();

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in
  if (currentUser && userProfile && !userProfile.disabled) {
    if (userProfile.role === "admin") return <Navigate to="/admin" replace />;
    if (userProfile.role === "student") return <Navigate to="/student" replace />;
  }

  const validate = () => {
    if (!name.trim()) return "Please enter your full name.";
    if (!grade) return "Please enter your grade.";

    const gradeNum = Number(grade);
    if (!Number.isInteger(gradeNum) || gradeNum < 4 || gradeNum > 8) {
      return "Grade must be between 4 and 8.";
    }

    if (!email.trim()) return "Please enter your email.";
    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await register(email, password, {
        name: name.trim(),
        grade: Number(grade),
        role: "student",
      });
      setSuccess(true);
    } catch (err) {
      const messages = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email": "Invalid email address.",
        "auth/weak-password": "Password is too weak.",
      };
      setError(messages[err.code] ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface rounded-2xl shadow-lg p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-3">
            <svg
              className="w-6 h-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">Account Created!</h2>
          <p className="text-sm text-gray-400 mb-5">
            Your account is ready. You can now sign in.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-2.5 rounded-xl bg-accent text-white font-bold text-sm text-center hover:bg-primary transition"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-primary">Olympiad Masters</h1>
          <p className="text-sm text-gray-400 mt-1">Create your student account</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-600 text-sm px-3 py-2 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-accent transition"
            />
          </div>

          {/* Grade */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Grade
            </label>
            <input
              type="number"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Eg. 4 "
              min="4"
              max="8"
              required
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-accent transition"
            />
          {grade && (Number(grade) < 4 || Number(grade) > 8) && (
            <p className="text-xs text-red-500 pl-1">Grade must be between 4 and 8.</p>
          )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-accent transition"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                className="w-full px-4 py-2.5 pr-11 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-accent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? <FiEyeOff size={18} /> : <BsEye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 pl-1">Minimum 6 characters</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 py-2.5 rounded-xl bg-accent text-white font-bold text-sm hover:bg-primary transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Link to login */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-accent font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;