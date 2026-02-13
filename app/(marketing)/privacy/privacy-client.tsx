"use client";

import { motion } from "framer-motion";
import { Mail, Shield } from "lucide-react";

export function PrivacyPageClient() {
	return (
		<div className="relative min-h-screen overflow-hidden">
			{/* Background */}
			<div className="fixed inset-0 -z-10">
				<div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950" />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.05),transparent_50%)]" />
			</div>

			{/* Hero Section */}
			<section className="pt-32 pb-12 sm:pt-40 sm:pb-16">
				<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="text-center"
					>
						<div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-700 shadow-xl shadow-red-500/25">
							<Shield className="size-8 text-white" />
						</div>
						<h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
							Privacy Policy
						</h1>
						<p className="mx-auto max-w-2xl text-muted-foreground">
							Last updated: September 23, 2025
						</p>
					</motion.div>
				</div>
			</section>

			{/* Content */}
			<section className="pb-20">
				<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="rounded-2xl border border-border/50 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:bg-neutral-900/80 sm:p-8"
					>
						<div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
							<p>
								Alecci Media LLC (&quot;we&quot;, &quot;us&quot;, or
								&quot;our&quot;) is committed to protecting your privacy. We
								offer subscribers access to the Alecci Media Bots (the
								&quot;Bot&quot;), which are made available across multiple
								platforms and have strategic marketing and sales information and
								capabilities (the &quot;Services&quot;), as well as other
								information and services we may provide. We have prepared this
								Privacy Policy (&quot;Privacy Policy&quot;) to describe to you
								our practices regarding the information that we collect from
								subscribers and the Services we offer.
							</p>
							<p>
								We are committed to complying with the Children&apos;s Online
								Protection Act of 1998 (&quot;COPPA&quot;). COPPA requires that
								we obtain parental consent before we allow children under the
								age of 13 to access and/or use our Services. We urge children to
								check with their parents before entering information through our
								Site and/or Services, and we recommend that parents discuss with
								their children restrictions regarding the online release of
								personal information to anyone they do not know.
							</p>
							<p>
								By using our Bot and/or Services, or by permitting your child to
								use our Services, you are agreeing to the terms of this Privacy
								Policy and the accompanying Alecci Media Terms of Service (the
								&quot;Terms&quot;), which are incorporated herein.
							</p>

							<h2>Information Collected</h2>
							<h3>Information You Provide to Us</h3>
							<p>
								When you utilize our Bot or Services, you may be prompted to
								provide personal information.
							</p>
							<p>
								We retain information on your behalf, including the content of
								the message and the recipient data, using your information. We
								will not use the raw text of conversations for training unless
								explicit consent is obtained.
							</p>
							<p>
								We may use anonymized, aggregated analytics data to improve the
								Bot.
							</p>
							<p>
								We may also collect personal information at other points in our
								Services that state that personal information is being
								collected.
							</p>

							<h3>Information Collected from Third-Party Companies</h3>
							<p>
								We may receive information about you from other sources. We may
								add this information to the information we have already
								collected from you via our Services in order to improve the
								Services.
							</p>

							<h2>Information Collected Automatically</h2>
							<h3>Generally</h3>
							<p>
								When you use our Services, some information is automatically
								collected. For example, when you use our Services, your
								geographic location, how you use the Services, information about
								the type of device you use, your mobile network information,
								your Open Device Identification Number (&quot;ODIN&quot;),
								date/time stamps for your visit, your unique device identifier
								(&quot;UDID&quot;), your browser type, operating system,
								Internet Protocol (IP) address, and domain name are all
								collected. We use this information to help us deliver the most
								relevant information to you and administer and improve the
								Services.
							</p>

							<h3>Log Files</h3>
							<p>
								We gather certain information automatically and store it in log
								files. This information includes IP addresses, browser type,
								Internet service provider (&quot;ISP&quot;), referring/exit
								pages, operating system, date/time stamp, and clickstream data.
								We use this information to maintain and improve the performance
								of the Services.
							</p>

							<h3>Cookies</h3>
							<p>
								We use cookies to collect information. &quot;Cookies&quot; are
								small pieces of information that a website or application sends
								to your computer&apos;s or mobile device&apos;s hard drive while
								you are viewing the Site or affiliated websites. We, and some
								third parties, may use both session Cookies (which expire once
								you close your web browser) and persistent Cookies (which stay
								on your device until you delete them) to provide you with a more
								personal and interactive experience on our Services. You may set
								your device settings to refuse cookies or to remove cookies from
								your hard drive, but our Site does not recognize &quot;Do Not
								Track&quot; signals. You can also learn more about Cookies by
								visiting www.allaboutcookies.org which includes additional
								useful information on Cookies and how to block them using
								different browsers. By blocking or deleting Cookies used on our
								Site, you may not be able to take full advantage of our
								Services.
							</p>

							<h3>Marketing Companies</h3>
							<p>
								We may work with a number of companies for assistance in
								marketing our Services to you on third-party websites. These
								companies may collect information about online activities
								conducted on a particular computer, browser, or device over time
								and across third-party websites or online services for the
								purpose of delivering advertising that is likely to be of
								greater interest to you on our Site and those of third parties.
							</p>

							<h3>Analytics Companies</h3>
							<p>
								We may work with a number of third-party analytics companies
								that collect information anonymously and report trends without
								identifying individual visitors. These services allow us to view
								a variety of reports about how visitors interact with the
								Services so we can improve our Site and understand how people
								find and navigate it.
							</p>

							<h2>Use of Your Personal Information</h2>
							<h3>General Use</h3>
							<p>
								In general, personal information you submit to us is used either
								to respond to requests that you make, aid us in serving you
								better, or market our Services. We use your personal information
								in the following ways:
							</p>
							<ul>
								<li>
									Respond to comments, requests, and questions and provide
									customer service
								</li>
								<li>Identify you as a user in our system</li>
								<li>Provide, process, and deliver the Services you request</li>
								<li>
									Improve the quality of experience when you interact with our
									Services
								</li>
								<li>Send you administrative e-mail notifications</li>
								<li>Resolve disputes and/or troubleshoot problems</li>
								<li>
									Develop, improve, and deliver marketing and advertising for
									the Services
								</li>
								<li>
									Send newsletters, surveys, offers, and other promotional
									materials related to our Services and for other marketing
									purposes
								</li>
							</ul>

							<h3>Creation of Anonymous Data</h3>
							<p>
								We may create anonymous data records from personal information
								by excluding information that is personally identifiable to you,
								such as your name. We use this anonymous data to analyze request
								and usage patterns so that we may enhance the content of our
								Services and improve Site navigation. We reserve the right to
								use anonymous data for any purpose and disclose anonymous data
								to third parties in our sole discretion.
							</p>

							<h3>User Feedback</h3>
							<p>
								We may post user feedback on the Services from time to time. If
								you make any comments on a blog, social networking website, or
								forum associated with the Services, you should be aware that any
								information you submit there can be read, collected, or used by
								other users of these forums and could be used to send you
								unsolicited messages. We are not responsible for the information
								you choose to submit in these blogs and forums.
							</p>

							<h2>Disclosure of Your Personal Information</h2>
							<h3>Third Parties Designated by You</h3>
							<p>
								When you use the Services, the personal information you provide
								will be shared with the third parties that you authorize to
								receive such information.
							</p>

							<h3>Third Party Service Providers</h3>
							<p>
								We may share your personal information with third-party service
								providers to provide you with the Services, provide updates and
								technical support, and market the Services.
							</p>

							<h3>Other Disclosures</h3>
							<p>
								Regardless of any choices you make regarding your personal
								information (as described below), we may disclose personal
								information if we believe in good faith that such disclosure is
								necessary: (i) in connection with any legal investigation; (ii)
								to comply with relevant laws or to respond to subpoenas or
								warrants served on us; (iii) to protect or defend the rights or
								property of Alecci Media LLC, our subsidiaries, divisions, and
								affiliates or users of the Services; and/or (iv) to investigate
								or assist in preventing any violation or potential violation of
								the law, this Privacy Policy, or our Terms.
							</p>

							<h2>
								Your Rights Under the General Data Protection Regulation (GDPR)
							</h2>
							<ul>
								<li>
									<strong>Right to Access</strong> – the right to be provided
									with a copy of your personal information
								</li>
								<li>
									<strong>Right to Rectification</strong> – the right to require
									us to correct any mistakes in your personal information
								</li>
								<li>
									<strong>Right to be Forgotten</strong> – the right to require
									us to delete your personal information—in certain situations
								</li>
								<li>
									<strong>Right to Restriction of Processing</strong> – the
									right to require us to restrict processing of your personal
									information—in certain circumstances, e.g., if you contest the
									accuracy of the data
								</li>
								<li>
									<strong>Right to Data Portability</strong> – the right to
									receive the personal information you provided to us, in a
									structured, commonly used, and machine-readable format and/or
									transmit that data to a third party—in certain situations
								</li>
								<li>
									<strong>Right to Object</strong> – the right to object at any
									time to your personal information being processed for direct
									marketing (including profiling) and in certain other
									situations to our continued processing of your personal
									information
								</li>
								<li>
									<strong>
										Right Not to be Subjected to Automated Individual
										Decision-Making
									</strong>{" "}
									– the right not to be subject to a decision based solely on
									automated processing (including profiling) that produces legal
									effects concerning you or similarly significantly affects you
								</li>
							</ul>
							<p>
								For further information on each of those rights, including the
								circumstances in which they apply, see the guidance from the UK
								Information Commissioner&apos;s Office (ICO) on individual
								rights under the General Data Protection Regulation.
							</p>

							<h2>
								Your Rights Under the California Consumer Privacy Act (CCPA)
							</h2>
							<p>
								You have the right under the CCPA of 2018 and certain other
								privacy and data protection laws, as applicable, to exercise
								free of charge:
							</p>

							<h3>Disclosure of Personal Information We Collect About You</h3>
							<p>You have the right to know:</p>
							<ul>
								<li>
									The categories of personal information we have collected about
									you
								</li>
								<li>
									The categories of sources from which the personal information
									is collected
								</li>
								<li>
									Our business or commercial purpose for collecting or selling
									personal information
								</li>
								<li>
									The categories of third parties with whom we share personal
									information, if any
								</li>
								<li>
									The specific pieces of personal information we have collected
									about you
								</li>
							</ul>

							<h3>Right to Deletion</h3>
							<p>
								Subject to certain exceptions, on receipt of a verifiable
								request from you, we will:
							</p>
							<ul>
								<li>Delete your personal information from our records</li>
								<li>
									Direct any service providers to delete your personal
									information from their records
								</li>
							</ul>

							<h3>Protection Against Discrimination</h3>
							<p>
								You have the right to not be discriminated against by us because
								you exercised any of your rights under the CCPA.
							</p>

							<h2>Children&apos;s Online Privacy Protection Act (COPPA)</h2>
							<p>
								We understand the importance of protecting children&apos;s
								privacy and are fully compliant with COPPA. We do not knowingly
								collect personal information from children under the age of
								thirteen (13). Any information we need regarding children under
								thirteen (13) must be provided by his or her parent or guardian.
								If you are under thirteen (13), you are not permitted to use the
								Services and should not send any information about yourself to
								us through the Site.
							</p>
							<p>
								In the event we become aware that we have collected personal
								information from anyone under the age of thirteen (13), we will
								dispose of that information in accordance with COPPA and other
								applicable laws and regulations. If you are a parent or guardian
								and you believe that your child under the age of thirteen (13)
								has provided us with personal information without COPPA-required
								consent, please contact us at ai.bossbrainz@aleccimedia.com.
							</p>

							<h2>Third-Party Websites</h2>
							<p>
								Our Site may contain links to third party websites. When you
								click on a link to any other website or location, you will leave
								our Site and go to another website, and another entity may
								collect personal information or anonymous data from you. We have
								no control over, do not review, and are not responsible for
								these outside websites or their content. Please understand that
								the terms of this Privacy Policy do not apply to any outside
								websites, content, or any collection of your personal
								information after you click on links to such outside websites.
								We encourage you to read the privacy policies of every website
								that you visit. The links to third party websites or locations
								are for your convenience and do not signify our endorsement of
								such third parties or their products, content, or websites.
							</p>

							<h2>Choice/Opt-Out</h2>
							<p>
								We want to communicate with you only if you want to hear from
								us. You may choose to stop receiving marketing emails by
								following the unsubscribe instructions included in these emails,
								updating your communications preferences on our Site, or
								contacting us directly. Please note, however, that as a user of
								the Services, you cannot opt-out of some administrative
								communications that are reasonably necessary to the Services,
								such as billing notifications.
							</p>
							<p>
								You have the right to access, update, and correct inaccuracies
								in your personal information in our custody and control, subject
								to certain exceptions prescribed by law. You may request access,
								an updating, or the correction of inaccuracies in other personal
								information in our custody or control by contacting us directly.
							</p>
							<p>
								Parents or legal guardians can review any personal information
								collected about their minor child, have this information
								deleted, request that there be no further collection or use of
								their child&apos;s personal information, and/or allow for our
								collection and use of their child&apos;s personal information
								while withholding consent for us to disclose it to third
								parties. We take steps to verify the identity of anyone
								requesting information about a child and to ensure that the
								person is in fact the child&apos;s parent or legal guardian.
							</p>
							<p>
								We reserve the right to retain any personal information, unless
								requested to be deleted by a parent or legal guardian of a minor
								child, reasonably necessary to appropriately document our
								business activities and record retention purposes. We will store
								personal information for as long as reasonably necessary for the
								purposes described in this Privacy Policy. You may request
								deletion of your personal information by us, and we will use
								commercially reasonable efforts to honor your request where
								required by law, but please note that we may be required to keep
								such information and not delete it or to keep this information
								for a certain time, in which case we will comply with your
								deletion request only after we have fulfilled such requirements.
							</p>

							<h2>California Residents</h2>
							<p>
								If you are a California resident and have an established
								business relationship with us, you may request a notice
								disclosing the categories of personal information we have shared
								with third parties, for the third parties&apos; direct marketing
								purposes, during the preceding calendar year. To request a
								notice, please contact us directly.
							</p>

							<h2>Targeted Advertising</h2>
							<p>
								We may work with third parties, such as network advertisers and
								ad exchanges, that use tracking technologies on our Site in
								order to provide tailored advertisements on our behalf and/or on
								behalf of other advertisers across. We may use third-party
								analytics service providers to evaluate and provide us and/or
								third parties with information about the use of these ads on
								third-party websites and viewing of ads and of our content.
								Network advertisers are third parties that display
								advertisements, which may be based on your activities (including
								past visits to our Site) and mobile media (&quot;Targeted
								Advertising&quot;).
							</p>
							<p>
								Targeted Advertising uses information collected on an
								individual&apos;s web browsing behavior on one website (such as
								the pages they have visited or the searches they have made) in
								order to target advertising to that individual on another
								website. Targeting called Cross Device Tracking can also take
								place across devices such as tablets, smartphones, laptops, and
								smart televisions. Third parties collect this information by
								placing or accessing cookies or other tracking technologies in
								your browser when you visit this or other websites.
							</p>
							<p>
								You may wish to visit
								http://www.networkadvertising.org/optout_nonppii.asp, which
								provides information regarding this practice by Network
								Advertising Initiative (&quot;NAI&quot;) members and your
								choices regarding having this information used by these
								companies, including the &quot;opt-out&quot; procedures of NAI
								members. You may also opt-out of receiving Targeted Advertising
								on participating websites and services by visiting the Digital
								Advertising Alliance (&quot;DAA&quot;) website at
								http://www.aboutads.info/choices/.
							</p>

							<h2>Users Outside of the United States</h2>
							<p>
								The Site is maintained in the United States of America. By using
								the Site, you freely and specifically give us your consent to
								export your personal information to the United States and to
								store and use it in the United States as specified in this
								Privacy Policy. You understand that data stored in the United
								States may be subject to lawful requests by the courts or law
								enforcement authorities in the United States.
							</p>

							<h2>Changes to this Privacy Policy</h2>
							<p>
								We may revise this Privacy Policy from time to time, and if we
								make any material changes in the way we use your personal
								information, we will notify you by sending you an e-mail to the
								last e-mail address you provided to us and/or by prominently
								posting notice of the changes on the Services and updating the
								&quot;Last Updated&quot; date below. If we make any changes to
								this Privacy Policy, they will be effective upon the earlier of
								thirty (30) calendar days following our dispatch of an e-mail
								notice to you or thirty (30) calendar days following our posting
								of notice of the changes on the Services. Please note that at
								all times you are responsible for updating your personal
								information to provide us with your most current e-mail address.
								Continued use of our Services following notice of such changes
								will indicate your acknowledgement of such changes and agreement
								to be bound by the terms and conditions of such changes.
							</p>
						</div>
					</motion.div>

					{/* Contact Section */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="mt-8 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-6 shadow-lg dark:border-red-900/50 dark:from-red-950/30 dark:to-neutral-900 sm:p-8"
					>
						<div className="flex items-start gap-4">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
								<Mail className="size-5 text-red-600 dark:text-red-400" />
							</div>
							<div>
								<h2 className="mb-2 text-lg font-semibold text-foreground">
									Contact Us
								</h2>
								<p className="text-muted-foreground">
									If you have questions about this Privacy Policy or our data
									practices, please contact us at{" "}
									<a
										href="mailto:ai.bossbrainz@aleccimedia.com"
										className="font-medium text-red-600 hover:underline dark:text-red-400"
									>
										ai.bossbrainz@aleccimedia.com
									</a>
								</p>
							</div>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}
