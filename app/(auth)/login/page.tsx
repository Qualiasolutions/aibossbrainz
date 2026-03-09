import { LoginContent } from "./login-content";

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{
		plan?: string;
		redirect?: string;
		reason?: string;
	}>;
}) {
	const params = await searchParams;

	return (
		<LoginContent
			plan={params.plan}
			rawRedirect={params.redirect}
			reason={params.reason}
		/>
	);
}
