import React from "react";

interface ConfirmAction {
  type: "delete" | "deactivate" | "activate";
  userEmail: string;
}

interface ConfirmationModalProps {
  show: boolean;
  action: ConfirmAction | null;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  show,
  action,
  onCancel,
  onConfirm,
  isProcessing = false,
}) => {
  if (!show || !action) return null;

  const { type, userEmail } = action;

  const bgColor =
    type === "delete"
      ? "bg-red-100"
      : type === "deactivate"
      ? "bg-orange-100"
      : "bg-green-100";

  const textColor =
    type === "delete"
      ? "text-red-600"
      : type === "deactivate"
      ? "text-orange-600"
      : "text-green-600";

  const buttonColor =
    type === "delete"
      ? "bg-red-600 hover:bg-red-700"
      : type === "deactivate"
      ? "bg-orange-600 hover:bg-orange-700"
      : "bg-green-600 hover:bg-green-700";

  const title =
    type === "delete"
      ? "Delete User"
      : type === "deactivate"
      ? "Deactivate User"
      : "Activate User";

  const confirmLabel =
    type === "delete"
      ? "Delete"
      : type === "deactivate"
      ? "Deactivate"
      : "Activate";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-6">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${bgColor}`}
          >
            <svg
              className={`w-8 h-8 ${textColor}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {type === "delete" ? (
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
          {title}
        </h2>

        <p className="text-gray-600 text-center mb-6">
          Are you sure you want to {type}{" "}
          <span className="font-semibold">{userEmail}</span>?
          {type === "delete" && " This action cannot be undone."}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isProcessing}
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
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonColor}`}
          >
            {isProcessing ? (
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
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
