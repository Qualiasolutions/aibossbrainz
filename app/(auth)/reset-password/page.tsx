import { ResetPasswordContent } from "./reset-password-content";

export default async function ResetPasswordPage({
	searchParams,
}: {
	searchParams: Promise<{
		error?: string;
		error_description?: string;
	}>;
}) {
	const params = await searchParams;

	return (
		<ResetPasswordContent
			error={params.error}
			errorDescription={params.error_description}
		/>
	);
}
