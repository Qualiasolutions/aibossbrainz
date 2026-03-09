import { SubscribeContent } from "./subscribe-content";

export default async function SubscribePage({
	searchParams,
}: {
	searchParams: Promise<{
		plan?: string;
		reason?: string;
		payment?: string;
		welcome?: string;
		redirect?: string;
	}>;
}) {
	const params = await searchParams;

	return (
		<SubscribeContent
			plan={params.plan}
			reason={params.reason}
			payment={params.payment}
			welcome={params.welcome}
			rawRedirect={params.redirect}
		/>
	);
}
