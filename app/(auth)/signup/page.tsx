import { SignupContent } from "./signup-content";

export default async function SignupPage({
	searchParams,
}: {
	searchParams: Promise<{ plan?: string }>;
}) {
	const params = await searchParams;

	return <SignupContent plan={params.plan} />;
}
