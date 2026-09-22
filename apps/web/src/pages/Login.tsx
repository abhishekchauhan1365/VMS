import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { Button, Input, Label, FieldError, Card } from '../components/ui/primitives';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

const roleHome: Record<string, string> = {
  ADMIN: '/admin/analytics',
  HOST: '/host/invite',
  SECURITY: '/desk/board',
};

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (user) {
    navigate(roleHome[user.role] ?? '/', { replace: true });
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success('Welcome back');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-1 text-xl font-bold text-navy-900">Visitor Management System</h1>
        <p className="mb-6 text-sm text-navy-400">Sign in to continue</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" {...register('email')} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
