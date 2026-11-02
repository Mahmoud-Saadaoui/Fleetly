import { Component } from "react";
import { withTranslation } from "react-i18next";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
  }

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              {t("error.title")}
            </h1>
            <p className="text-gray-600 mb-6">
              {t("error.message")}
            </p>
            <div className="flex gap-4 justify-center">
              {/* This boundary is mounted above <BrowserRouter>, so it must not
                  use react-router components (no Router context available). */}
              <a
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t("error.goHome")}
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                {t("error.refresh")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ErrorBoundaryWithTranslation = withTranslation()(ErrorBoundary);
ErrorBoundaryWithTranslation.displayName = "ErrorBoundary";

export default ErrorBoundaryWithTranslation;
