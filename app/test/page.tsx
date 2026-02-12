export default function TestPage() {
	return (
		<div className="p-8">
			<h1 className="mb-4 font-bold text-2xl">Test Page - Alecci Media</h1>
			<p>If you can see this page, the deployment is working!</p>
			<div className="mt-4">
				<h2 className="font-semibold text-lg">UI Features to Test:</h2>
				<ul className="mt-2 list-inside list-disc">
					<li>Sidebar should be open by default</li>
					<li>Model selector dropdown should have increased height</li>
					<li>Overall layout should work properly</li>
				</ul>
			</div>
		</div>
	);
}
