import { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, LogIn, Users, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RMDLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkIfAlreadyLoggedIn();
  }, []);

  const checkIfAlreadyLoggedIn = async () => {
    try {
      const user = await User.me();
      if (user && user.role === 'md') {
        navigate(createPageUrl("MonthlyReport"));
      }
    } catch (error) {
      // User not logged in, stay on login page
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await User.loginWithRedirect(window.location.origin + createPageUrl("MonthlyReport"));
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-8">
            <Link to={createPageUrl("Home")} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
              Regional MD Portal
            </CardTitle>
            <p className="text-slate-600">
              Monthly performance reporting access
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Regional Managers Only</span>
              </div>
              <p className="text-sm text-blue-800">
                This portal is restricted to Regional Managing Directors for monthly performance reporting.
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">
                  Please sign in with your company Google account to access your monthly reporting form.
                </p>
              </div>

              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-3" />
                    Sign In with Google
                  </>
                )}
              </Button>
            </div>

            <div className="text-center pt-4">
              <p className="text-xs text-slate-500">
                Need help? Contact your system administrator
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}