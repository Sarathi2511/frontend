// Login Page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, Phone, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated, isExecutive, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      if (isExecutive) {
        navigate('/orders');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, isExecutive, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!phone || !password) {
      setError('Please enter both phone number and password');
      return;
    }
    
    setIsLoggingIn(true);
    try {
      await login(phone, password);
    } catch (err) {
      setError('Invalid phone number or password');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="rounded-full bg-primary p-2 w-12 h-12 flex items-center justify-center">
            <LockKeyhole className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Sarathi Orders</h1>
          <p className="text-muted-foreground">Login to your account to continue</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4 will-change-transform">
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    className="pl-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoggingIn}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full transform-gpu" disabled={isLoggingIn || loading}>
                {(isLoggingIn || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoggingIn ? 'Signing in...' : 'Sign In'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

// Create a component to reset body scroll
export function BodyScrollReset() {
  useEffect(() => {
    // Force reset body overflow on component mount
    document.body.style.overflow = '';
    
    return () => {
      // Clean up just in case
      document.body.style.overflow = '';
    };
  }, []);
  
  return null;
}
