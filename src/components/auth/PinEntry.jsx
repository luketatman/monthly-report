import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, ArrowLeft } from "lucide-react";
import { RegionPin } from "@/entities/RegionPin";

export default function PinEntry({ onPinVerified, onBack, selectedRole }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin || pin.length !== 4) {
      setError("Please enter a 4-digit PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Convert selected role to uppercase and replace underscores with spaces to match the 'title' field in the entity
      const titleToMatch = selectedRole.toUpperCase().replace(/_/g, ' ');
      const results = await RegionPin.filter({ pin: pin, title: titleToMatch });

      if (results.length > 0) {
        const matchedPinData = results[0];
        // Pass the entire matched object to the verification handler
        onPinVerified(matchedPinData);
      } else {
        setError("Invalid PIN for your selected role. Please try again.");
        setPin("");
      }
    } catch (err) {
      console.error("Error verifying PIN:", err);
      setError("An error occurred during verification. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {selectedRole === 'rmd' ? 'Regional' : selectedRole === 'business_line_leader' ? 'Service Line Leader' : 'Office'} Access Verification
          </CardTitle>
          <p className="text-slate-600 mt-2">
            Please enter your 4-digit PIN to continue, and if you do not have your code please contact Luke.tatman@avisonyoung.com
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error &&
          <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          }

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">
                4-Digit PIN
              </label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                placeholder="Enter PIN" className="bg-slate-500 text-2xl px-3 py-2 font-mono flex h-10 w-full rounded-md border border-input ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm tracking-widest"

                maxLength={4}
                autoFocus />

            </div>

            <Button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-lg font-medium">

              {loading ?
              <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Verifying...
                </> :

              "Verify PIN"
              }
            </Button>
          </form>

          <div className="text-center">
            <Button variant="outline" onClick={onBack} className="bg-slate-500 px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10 w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Role Selection
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>);

}