"use client";

import { motion } from "framer-motion";
import { FileText, Mail } from "lucide-react";

export default function TermsPage() {
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
							<FileText className="size-8 text-white" />
						</div>
						<h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
							Terms of Service
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
								&quot;our&quot;) offers subscribers access to the Alecci Media
								Bots (the &quot;Bot&quot;), which are made available across
								multiple platforms and have strategic marketing and sales
								information and capabilities (the &quot;Services&quot;), as well
								as other information and services we may provide. The Bot and
								the Services are made available to you only under the following
								terms of service (the &quot;Terms&quot;).
							</p>
							<p>
								By accessing or using the Bot and/or Services, you acknowledge
								that you have read, understood, and agreed to be bound by these
								Terms. If you do not agree to these Terms, you should not use or
								access this Bot. We reserve the right to revise these Terms at
								any time by updating this posting. You are encouraged to review
								these Terms periodically because your use of the Bot after the
								posting of changes will constitute your acceptance of the
								changes. Agreement to these Terms also constitutes your
								agreement to the Alecci Media LLC Privacy Policy (the
								&quot;Privacy Policy&quot;), which are incorporated herein.
							</p>
							<p className="font-semibold">
								Alecci Media LLC and its affiliates do not provide financial,
								tax, legal, or accounting advice. This material has been
								prepared for informational purposes only and is not intended to
								provide, and should not be relied on for, professional
								financial, tax, legal, or accounting advice. You should consult
								with your own financial, tax, legal, and accounting advisors
								before engaging in any transaction. Alecci Media LLC does not
								guarantee any outcomes and is not liable for business decisions
								made based upon the Services.
							</p>

							<h2>Use of the Bot</h2>
							<h3>Access to Services</h3>
							<p>
								Subject to these Terms, we grant you a limited, non-exclusive,
								non-transferable personal license to access and use the Bot. We
								reserve the right, in our sole discretion and without notice to
								you, to revise the Services available on the Bot and to change,
								suspend, or discontinue any aspect of the Bot. We may also
								impose rules for and limits on use of the Bot or restrict your
								access to part or all of the Bot without notice or penalty.
							</p>

							<h3>Use of Third-Party Offerings</h3>
							<p>
								You may be able to access content, products, or services
								provided by third parties through information made available by
								the Bot. We refer to all such content, services, and products as
								&quot;Third-Party Offerings&quot;. If you elect to use such
								Third-Party Offerings, you understand that your use of them will
								be subject to any terms and conditions required by the
								applicable third-party provider(s). We are not the provider of,
								and are not responsible for, any such Third-Party Offerings, and
								these Terms do not themselves grant you any rights to access,
								use, or purchase any Third-Party Offerings.
							</p>

							<h3>User Restrictions</h3>
							<p>
								You are prohibited from replicating, reverse engineering, or
								adapting the Bot. Additionally, you may not use the Bot&apos;s
								outputs, data, or setup to train other bots or competitive
								services. Any violation of these restrictions will result in the
								immediate termination of your access to the Bot and Services.
								Alecci Media LLC reserves the right to pursue any and all legal
								actions to enforce these terms. All intellectual property rights
								related to the Bot are owned by Alecci Media LLC.
							</p>

							<h3>Prohibited Use</h3>
							<p>
								You are strictly prohibited from using the Bot for any unlawful,
								abusive, or exploitative purpose. Such prohibited uses include,
								but are not limited to, activities that violate applicable laws
								or regulations, infringe on the rights of others, or exploit the
								Bot&apos;s capabilities in a manner that is harmful or
								detrimental to any individual or entity. Any breach of this
								provision will result in the immediate termination of your
								access to the Bot and Services, and Alecci Media LLC reserves
								the right to pursue all available legal remedies.
							</p>

							<h2>Disclaimers, Limitations, and Exclusions of Liability</h2>
							<h3>Disclaimer</h3>
							<p>
								The information contained in the Bot is provided for
								informational purposes only.
							</p>

							<h3>Limited Warranties</h3>
							<p className="uppercase text-sm">
								THE BOT, ALL INFORMATION, CONTENT, MATERIALS, AND SERVICES
								RELATED TO THE FOREGOING, AND THE SERVICES RECEIVED BY YOU ARE
								PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; AND TO
								THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW. WE AND OUR
								AFFILIATES DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED,
								INCLUDING, BUT NOT LIMITED TO, ANY WARRANTIES OF MERCHANTABILITY
								AND FITNESS FOR A PARTICULAR PURPOSE. APPLICABLE LAW MAY NOT
								ALLOW THE EXCLUSION OF CERTAIN IMPLIED WARRANTIES, SO THE ABOVE
								EXCLUSION MAY NOT APPLY TO YOU. WE AND OUR AFFILIATES DO NOT
								WARRANT THAT YOUR USE OF THE BOT OR SERVICES WILL BE
								UNINTERRUPTED, ERROR-FREE, OR VIRUS FREE. WE ARE NOT THE
								PROVIDER OF, AND MAKE NO WARRANTIES WITH RESPECT TO, ANY
								THIRD-PARTY OFFERINGS. WE DO NOT GUARANTEE THE SECURITY OF ANY
								INFORMATION TRANSMITTED TO OR FROM THE BOT OR SERVICES, AND YOU
								AGREE TO ASSUME THE SECURITY RISK FOR ANY INFORMATION YOU
								PROVIDE USING THE BOT OR SERVICES.
							</p>
							<p className="uppercase text-sm">
								NO REPRESENTATION OR WARRANTY IS MADE THAT THE BOT PROVIDES
								COMPREHENSIVE OR ACCURATE INFORMATION. WE RESERVE THE RIGHT TO
								FILTER, MODIFY, OR REMOVE CONTENT, MEDIA, INFORMATION, OR ANY
								OTHER MATERIAL FROM THE BOT AND FROM THE OUTPUT OF THE BOT. YOU
								UNDERSTAND THAT WE HAVE DEVELOPED OUR TECHNOLOGIES TO FIND
								INFORMATION THAT WE BELIEVE WILL BE MOST RELEVANT AND
								INTERESTING TO YOU. ACCORDINGLY, WE MAY, IN OUR DISCRETION,
								FILTER OUT LINKS TO CONTENT AGGREGATORS, SEARCH ENGINES, OR
								OTHER ONLINE SERVICES WHOSE TECHNOLOGIES AND SERVICES, IN OUR
								OPINION, ARE INCONSISTENT WITH THESE OBJECTIVES.
							</p>

							<h3>Limitation of Liability</h3>
							<p className="uppercase text-sm">
								USE OF OUR BOT AND/OR THE SERVICES RECEIVED BY YOU ARE AT YOUR
								OWN RISK. IN NO EVENT WILL WE OR OUR AFFILIATES BE LIABLE FOR
								ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR SPECIAL DAMAGES IN
								CONNECTION WITH THESE TERMS, THE BOT, OR THE SERVICES, WHETHER
								OR NOT SUCH DAMAGES WERE FORESEEABLE AND EVEN IF WE WERE ADVISED
								THAT SUCH DAMAGES WERE LIKELY OR POSSIBLE. IN NO EVENT WILL OUR
								AGGREGATE LIABILITY TO YOU FOR ANY AND ALL CLAIMS ARISING IN
								CONNECTION WITH THESE TERMS, THE BOT, OR THE SERVICES EXCEED THE
								GREATER OF ONE HUNDRED FIFTY DOLLARS (U.S. $150.00) OR THE
								AMOUNTS YOU HAVE PAID TO ALECCI MEDIA LLC IN THE PRIOR SIX (6)
								MONTHS HEREUNDER.
							</p>
							<p className="uppercase text-sm">
								YOU ACKNOWLEDGE THAT THIS LIMITATION OF LIABILITY IS AN
								ESSENTIAL TERM BETWEEN YOU AND US RELATING TO THE PROVISION OF
								THE BOT AND THE SERVICES TO YOU, AND WE WOULD NOT PROVIDE THE
								BOT OR SERVICES TO YOU WITHOUT THIS LIMITATION.
							</p>

							<h3>Indemnification</h3>
							<p className="uppercase text-sm">
								YOU AGREE TO INDEMNIFY, HOLD HARMLESS, AND DEFEND ALECCI MEDIA
								LLC, ITS SUBSIDIARIES, DIVISIONS, AND AFFILIATES AND THEIR
								RESPECTIVE OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND
								AFFILIATES FROM ANY AND ALL CLAIMS, LIABILITIES, DAMAGES, COSTS,
								AND EXPENSES OF DEFENSE, INCLUDING ATTORNEYS&apos; FEES, IN ANY
								WAY ARISING FROM OR RELATED TO YOUR ILLEGAL USE OF THE BOT, YOUR
								VIOLATION OF THESE TERMS OR THE PRIVACY POLICY OR YOUR VIOLATION
								OF ANY LAW OR THE RIGHTS OF A THIRD PARTY.
							</p>

							<h2>Additional Terms</h2>
							<h3>Governing Law</h3>
							<p>
								These Terms will be governed by the laws of the State of Arizona
								without giving effect to any conflict of law principles that may
								require the application of the law of another jurisdiction.
							</p>

							<h3>Disputes</h3>
							<p>
								Any dispute relating in any way to your visit to or use of the
								Bot, to the Services you purchase through the Bot, or to your
								relationship with us will be submitted to confidential
								arbitration in Arizona. You hereby consent to and waive all
								defenses of lack of personal jurisdiction and forum non
								conveniens with respect to venue and jurisdiction in the state
								and federal courts of Arizona. Arbitration under these Terms
								will be conducted pursuant to the Commercial Arbitration Rules
								then prevailing at the American Arbitration Association. The
								arbitrator&apos;s award will be final and binding and may be
								entered into as a judgment in any court of competent
								jurisdiction. To the fullest extent permitted by applicable law,
								no arbitration under these Terms will be joined to an
								arbitration involving any other party subject to these Terms,
								whether through class action proceedings or otherwise.{" "}
								<strong>
									You agree that regardless of any statute or law to the
									contrary, any claim or cause of action arising out of, related
									to, or connected with the use of this Bot or these Terms must
									be filed within one (1) year after such claim of action arose
									or be forever banned.
								</strong>
							</p>

							<h3>Modifications to Terms</h3>
							<p>
								We may change these Terms from time to time. Any such changes
								will become effective upon the earlier of thirty (30) calendar
								days following our dispatch of an e-mail notice to you (if
								applicable) or thirty (30) calendar days following our posting
								of notice of the changes on our Bot. These changes will be
								effective immediately for new users of our Bot or Services. If
								you object to any such changes, your sole recourse will be to
								cease using the Bot and the Services. Continued use of the Bot
								or the Services following posting of any such changes will
								indicate your acknowledgement of such changes and your agreement
								to be bound by the revised Terms, inclusive of such changes.
							</p>

							<h3>Waiver; Remedies</h3>
							<p>
								The failure of us to, partially or fully, exercise any rights or
								the waiver of any breach of these Terms of Service by you will
								not prevent a subsequent exercise of such right by us or be
								deemed a waiver by us of any subsequent breach by you of the
								same or any other term of these Terms. The rights and remedies
								of us under these Terms and any other applicable agreement
								between you and us will be cumulative, and the exercise of any
								such right or remedy will not limit our right to exercise any
								other right or remedy.
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
									If you have any questions about these Terms, please contact us
									at{" "}
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
