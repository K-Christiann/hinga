import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  Clock3,
  Flag,
  HeartHandshake,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRoundX,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { WriteAttempt } from "../../domain/privateWrites";
import type { Reply, Thought } from "../../domain/models";
import type { ThoughtFilter } from "../../domain/pagination";
import { useApp, useData, useDraftGuard, useRetainedState, useDisplayPreference } from "../context";
import { useCursorCollection } from "../hooks/pagination";
import { ReportConcernDialog, type ReportTarget } from "../components/ReportConcernDialog";
import { SharingReviewNotice } from "../components/SharingReviewNotice";
import { FeedContinuation } from "../components/FeedContinuation";
import "./discussion-feed.css";
import "./feedback.css";
import {
  Button,
  EmptyState,
  ErrorLine,
  FlowerMark,
  Modal,
  PageIntro,
} from "../components/Primitives";

function relativeTime(date: string) {
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  return hours < 1
    ? "A little while ago"
    : hours < 24
      ? `${hours}h ago`
      : new Date(date).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        });
}
export function ThoughtCard({
  post,
  onOpen,
  onReport,
}: {
  post: Thought;
  onOpen(): void;
  onReport(): void;
}) {
  const { services, identity, policy, act } = useApp();
  const [saved, setSaved] = useState(Boolean(post.saved));
  useEffect(() => setSaved(Boolean(post.saved)), [post.saved]);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const longPost = post.body.length > 420 || post.body.split("\n").length > 7;
  const preview = post.body.slice(0, 420).split("\n").slice(0, 7).join("\n");
  return (
    <article
      className={`thought-post ${post.status === "pending" ? "pending-post" : ""}`}
    >
      <div className="post-top">
        <div className="post-person">
          <span className={`post-avatar avatar-${post.alias.length % 3}`}>
            <FlowerMark size={22} />
          </span>
          <div>
            <strong>
              {post.alias}{" "}
              {post.isMine && <span className="you-label">you</span>}
            </strong>
            <span>
              {relativeTime(post.createdAt)}

            </span>
          </div>
        </div>
        <div className="post-options">
          <button
            className="icon-button"
            onClick={() => setMore(!more)}
            aria-expanded={more}
            aria-label={`Options for ${post.alias}'s thought`}
          >
            <MoreHorizontal size={19} />
          </button>
          {more && (
            <div className="small-menu">
              {post.isMine ? (
                <>
                  <button
                    onClick={async () => {
                      await act(
                        () =>
                          services.community.toggleReplies(
                            identity!.id,
                            post.id,
                          ),
                        post.repliesOpen
                          ? "Replies turned off."
                          : "Replies turned on.",
                      );
                      setMore(false);
                    }}
                  >
                    <MessageCircle size={15} />
                    {post.repliesOpen ? "Turn replies off" : "Allow replies"}
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          "Withdraw this shared thought? It will leave the community feed.",
                        )
                      )
                        await act(
                          () =>
                            services.community.withdraw(identity!.id, post.id),
                          "Your thought was withdrawn.",
                        );
                      setMore(false);
                    }}
                  >
                    <X size={15} />
                    Withdraw thought
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMore(false);
                      onReport();
                    }}
                  >
                    <Flag size={15} />
                    Report a concern
                  </button>
                  <button
                    onClick={async () => {
                      await act(
                        () => services.community.block(identity!.id, post.id),
                        "This member is blocked. You can manage blocks in Settings.",
                      );
                      setMore(false);
                    }}
                  >
                    <UserRoundX size={15} />
                    Block this member
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <span className={`topic-tag topic-${post.category.length % 3}`}>
        {post.category}
      </span>
      <p className="post-body">{longPost && !expanded ? `${preview.trimEnd()}…` : post.body}</p>
      {longPost && <button type="button" className="post-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "See less" : "See more"}</button>}
      {post.status === "pending" && (
        <div className="pending-notice">
          <Clock3 size={16} />
          <span>
            Waiting for review · only visible to you until approved.
          </span>
        </div>
      )}
      <div className="post-footer">
        <button disabled={post.status !== "published"} onClick={onOpen}>
          <MessageCircle size={17} />
          {post.repliesOpen ? "Read & reply" : "Read conversation"}
        </button>
        <button
          className={saved ? "bookmarked" : ""}
          aria-pressed={saved}
          disabled={bookmarkBusy}
          aria-label={saved ? "Unsave this thought" : "Save this thought"}
          onClick={async () => {
            if (bookmarkBusy) return;
            setBookmarkBusy(true);
            const result = await act(async () => { await services.community.bookmark(identity!.id, post.id, !saved); return true; }, saved ? "Thought unsaved." : "Thought saved.", undefined, false);
            if (result) setSaved(!saved);
            setBookmarkBusy(false);
          }}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}

function Thread({
  post,
  open,
  loadingPost = false,
  onClose,
  onReportReply,
}: {
  post?: Thought;
  open: boolean;
  loadingPost?: boolean;
  onClose(): void;
  onReportReply(reply: Reply): void;
}) {
  const { services, identity, policy, act } = useApp();
  const replies = useCursorCollection<Reply>(
    (request) => services.community.repliesPage(identity!.id, post!.id, request),
    [services, identity?.id, post?.id],
    Boolean(post && open && identity),
  );
  const [body, setBody] = useRetainedState(`reply.${post?.id || "closed"}.body`, "");
  const [attempt, setAttempt] = useRetainedState(`reply.${post?.id || "closed"}.attempt`, () => new WriteAttempt());
  const [submitError, setSubmitError] = useRetainedState(`reply.${post?.id || "closed"}.error`, "");
  const [busy, setBusy] = useRetainedState(`reply.${post?.id || "closed"}.busy`, false);
  const [submitted, setSubmitted] = useRetainedState(`reply.${post?.id || "closed"}.submitted`, false);
  useDraftGuard(Boolean(body.trim()) || busy, `reply.${post?.id || "closed"}.editor`);
  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose(); }}
      title={loadingPost && !post ? "Opening this conversation…" : post ? "A little conversation." : "This thought is unavailable."}
      eyebrow="SPEAK YOUR THOUGHTS"
      className="thread-modal"
    >
      {post ? (
        <>
          <div className="thread-original">
            <div className="post-person">
              <span className="post-avatar">
                <FlowerMark size={23} />
              </span>
              <div>
                <strong>{post.alias}</strong>
                <span>
                  {relativeTime(post.createdAt)}

                </span>
              </div>
            </div>
            <p>{post.body}</p>
          </div>
          <div className="reply-heading">
            <h3>Supportive replies</h3>
            <span>Every reply is reviewed before sharing.</span>
          </div>
          <p className="reply-order">Newest replies first</p>
          <ErrorLine>{replies.error}</ErrorLine>
          <div className="reply-list">
            {replies.items.length ? (
              replies.items.map((reply) => (
                <div className="reply" key={reply.id}>
                  <FlowerMark size={21} />
                  <div>
                    <strong>
                      {reply.alias}
                      {reply.isMine && " · you"}
                      <small>
                        {reply.status === "pending"
                          ? "Pending review · visible only to you"
                          : relativeTime(reply.createdAt)}
                      </small>
                    </strong>
                    <p>{reply.body}</p>
                    {!reply.isMine && reply.status === "published" && <button className="reply-report-button" type="button" onClick={()=>onReportReply(reply)}><Flag size={13}/>Raise a concern</button>}
                  </div>
                </div>
              ))
            ) : (
              <p className="small-copy">
                {replies.loading ? "Loading the conversation…" : "No replies yet. A thoughtful word can be a small beginning."}
              </p>
            )}
          </div>
          {(replies.nextCursor || replies.error) && <div className="reply-page-controls"><Button tone="secondary" disabled={replies.loading} onClick={() => { void (replies.error ? replies.retry() : replies.loadMore()); }}>{replies.loading ? "Loading…" : replies.error ? "Try replies again" : "Load earlier replies"}</Button><span>{replies.items.length} replies shown</span></div>}
          {post.repliesOpen ? (
            <form
              className="reply-composer"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!body.trim() || busy || !policy?.communityCollectionOpen) return;
                setBusy(true); setSubmitError("");
                await act(async () => {
                  await services.community.reply(identity!.id, post.id, body, attempt.forContent([post.id, body.trim()]).writeId);
                  setAttempt(new WriteAttempt());
                  setBody("");
                  setSubmitted(true);
                }, "Your reply is waiting for review.", setSubmitError);
                setBusy(false);
              }}
            >
              <ErrorLine>{submitError}</ErrorLine>
              {submitted && <div className="submission-result"><p role="status">Your reply is waiting for moderator review.</p><Link to="/activity?view=submissions" className="inline-link" onClick={onClose}>View pending status <ArrowRight size={15} /></Link></div>}
              <p className="small-copy">{policy?.communityCollectionOpen ? "You can submit a reply for moderator approval." : "New replies are temporarily unavailable."} Approved replies appear to other members.</p>
              <label htmlFor="reply-body">
                A kind word, in your own words.
              </label>
              <textarea
                disabled={busy}
                id="reply-body"
                className="input"
                placeholder="Offer support without pressure or judgment…"
                rows={3}
                maxLength={1000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
              <div>
                <span>{body.length}/1,000</span>
                <Button type="submit" disabled={!policy?.communityCollectionOpen || !body.trim() || busy}>
                  {busy ? "Submitting…" : "Submit for review"}
                  <Send size={15} />
                </Button>
              </div>
            </form>
          ) : (
            <div className="inline-notice">
              The author has turned replies off for this thought.
            </div>
          )}
          <p className="small-copy mt-4">
            Shared discussions are not a live support service.{" "}
            <Link className="inline-link" to="/help" onClick={onClose}>
              You can open Get Help any time.
            </Link>
          </p>
        </>
      ) : loadingPost ? <p className="modal-lead" role="status">Loading this shared thought…</p> : (
        <p className="modal-lead">
          It may have been withdrawn or removed. Your personal space and support
          options are still here.
        </p>
      )}
    </Modal>
  );
}

export function Community() {
  const { services, identity, policy, act } = useApp();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<ThoughtFilter>("all");
  const [autoLoad, setAutoLoad] = useDisplayPreference("feedAutoLoad");
  const feedStart = useRef<HTMLDivElement>(null);
  const feed = useCursorCollection<Thought>(
    (request) => services.community.page(identity!.id, { ...request, filter }),
    [services, identity?.id, filter], Boolean(identity && services.communityEnabled),
  );
  const threadId = params.get("thread");
  const { data: threadPost, loading: threadLoading, error: threadError } = useData(
    () => threadId && identity && services.communityEnabled ? services.community.get(identity.id, threadId) : Promise.resolve(null),
    null as Thought | null, [threadId],
  );
  const [compose, setCompose] = useState(false);
  const [body, setBody] = useRetainedState("thought.body", "");
  const [attempt, setAttempt] = useRetainedState("thought.attempt", () => new WriteAttempt());
  const [category, setCategory] = useRetainedState("thought.category", "Just sharing");
  const [confirmed, setConfirmed] = useRetainedState("thought.confirmed", false);
  const [submitError, setSubmitError] = useRetainedState("thought.error", "");
  const [busy, setBusy] = useRetainedState("thought.busy", false);
  useDraftGuard(Boolean(body.trim()) || busy, "thought.editor");
  const [submitted, setSubmitted] = useRetainedState("thought.submitted", false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const selected = threadPost?.id === threadId ? threadPost : undefined;
  return (
    <>
      <PageIntro
        eyebrow="A LITTLE LESS ALONE"
        title="Speak your thoughts."
        action={
          <Button
            disabled={!services.communityEnabled || (!policy?.communityCollectionOpen && !body.trim())}
            onClick={() => setCompose(true)}
          >
            <Plus size={17} />
            {body.trim() ? "Continue draft" : "Share a thought"}
          </Button>
        }
      >
        No perfect words needed. Just a little space to be heard.
      </PageIntro>
      {submitted && <div className="submission-result"><p role="status">Your thought was submitted for review. It is not visible to other members yet.</p><Link to="/activity?view=submissions" className="button button-secondary">View pending status <ArrowRight size={16} /></Link><button type="button" className="icon-button" aria-label="Dismiss submission confirmation" onClick={() => setSubmitted(false)}><X size={18} /></button></div>}
      {services.communityEnabled && <SharingReviewNotice/>}
      <div className="community-layout">
        <div className="community-feed-column">
          <div className="feed-start" ref={feedStart} tabIndex={-1}>
            <div className="feed-composer-card"><span className="feed-composer-mark"><FlowerMark size={24} /></span><button type="button" disabled={!services.communityEnabled || (!policy?.communityCollectionOpen && !body.trim())} onClick={() => setCompose(true)}>Something you’d like to share?</button><button type="button" className="feed-compose-icon" disabled={!services.communityEnabled || (!policy?.communityCollectionOpen && !body.trim())} aria-label="Write a shared thought" onClick={() => setCompose(true)}><Plus size={20} /></button></div>
          <div
            className="community-tabs"
            role="group"
            aria-label="Filter thoughts"
          >
            {[
              ["all", "All thoughts"],
              ["mine", "My thoughts"],
              ["saved", "Saved"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "active" : ""}
                aria-pressed={filter === value}
                onClick={() => setFilter(value as ThoughtFilter)}
              >
                {label}
                {value === "saved" && <Bookmark size={13} />}
              </button>
            ))}
          </div>
          </div>
          <div className="feed-preferences"><span>Latest thoughts first</span><div><label><input type="checkbox" checked={autoLoad} onChange={(event) => setAutoLoad(event.target.checked)} />Load as I scroll</label><button type="button" disabled={feed.loading || !services.communityEnabled} onClick={() => { void feed.refresh(); }} aria-label="Refresh the current discussion feed"><RotateCcw size={14} /><span>Refresh</span></button></div></div>

          <ErrorLine>{feed.error || threadError}</ErrorLine>
          {!services.communityEnabled ? (
            <section className="card">
              <EmptyState
                icon={<MessageCircle size={32} />}
                title="This shared space is taking shape."
              >
                Community publication is paused until trained review and
                coverage are ready. Your private tools and Get Help remain
                available.
              </EmptyState>
            </section>
          ) : feed.items.length ? (
            <div className="thought-feed" aria-label="Shared thoughts" aria-busy={feed.loading}>
              {feed.items.map((post) => (
                <ThoughtCard
                  key={post.id}
                  post={post}
                  onOpen={() => setParams({ thread: post.id })}
                  onReport={() => {
                    setReportTarget({id:post.id,kind:"post"});
                  }}
                />
              ))}
            </div>
          ) : feed.loading ? <div className="feed-initial-loading" role="status"><FlowerMark size={28} /><p>Making a little room for the conversation…</p></div> : (
            <section className="card">
              <EmptyState
                icon={
                  filter === "saved" ? (
                    <Bookmark size={28} />
                  ) : (
                    <MessageCircle size={28} />
                  )
                }
                title={
                  filter === "mine"
                    ? "Your words can start here."
                    : filter === "saved"
                      ? "Keep a thought for later."
                      : "A quiet moment in the community."
                }
              >
                {filter === "mine"
                  ? "When you choose to share, your thoughts will appear here with their review status."
                  : filter === "saved"
                    ? "Tap the bookmark on a thought you’d like to come back to."
                    : "There are no thoughts to show right now."}
              </EmptyState>
            </section>
          )}
          {services.communityEnabled && <FeedContinuation hasMore={Boolean(feed.nextCursor)} loading={feed.loading} error={feed.error} count={feed.items.length} autoLoad={autoLoad && !compose && !reportTarget && !threadId} onMore={feed.loadMore} onRetry={feed.retry} onTop={() => { feedStart.current?.scrollIntoView({ block: "start" }); feedStart.current?.focus({ preventScroll: true }); }} />}
        </div>
        <aside className="community-aside">
          <section className="community-note">
            <FlowerMark size={39} />
            <span className="eyebrow">COME AS YOU ARE</span>
            <h2>
              You don’t have
              <br />
              to have the
              <br />
              <em>right words.</em>
            </h2>
            <p>You can share a little, read quietly, or simply be here.</p>
          </section>
          <section className="card guidelines-card">
            <ShieldCheck size={22} />
            <h3>A few things we care about.</h3>
            <ul>
              <li>Listen with kindness.</li>
              <li>Respect each person’s pace.</li>
              <li>Leave out identifying details.</li>
              <li>Share support, not instructions for harm.</li>
            </ul>
            <p>
              Shared posts are visible to members and reviewers. Aliases don’t
              guarantee complete anonymity.
            </p>
          </section>
          <section className="help-mini">
            <HeartHandshake size={22} />
            <h3>Need support sooner?</h3>
            <p>
              Community posts wait for review. This is not a live crisis
              response channel.
            </p>
            <Link className="text-link" to="/help">
              Open Get Help <ArrowRight size={15} />
            </Link>
          </section>

        </aside>
      </div>
      <Thread
        key={threadId || "closed"}
        post={selected}
        loadingPost={Boolean(threadId && threadLoading)}
        open={params.has("thread") && !reportTarget}
        onClose={() => setParams({})}
        onReportReply={reply=>setReportTarget({id:reply.id,kind:"reply"})}
      />
      <Modal
        open={compose}
        onClose={() => {
          if (!busy) setCompose(false);
        }}
        title="Whatever’s on your mind."
        eyebrow="SHARE A THOUGHT"
      >
        <p className="modal-lead">
          Share with signed-in members under a discussion alias. Your Google
          name and email won’t appear.
        </p>
        <SharingReviewNotice/>
        <ErrorLine>{submitError}</ErrorLine>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !policy?.communityCollectionOpen || !confirmed || !body.trim()) return;
            setBusy(true); setSubmitError("");
            await act(async () => {
              await services.community.submit(identity!.id, body, category, attempt.forContent([body.trim(), category]).writeId);
              setAttempt(new WriteAttempt());
              setCompose(false);
              setBody("");
              setConfirmed(false);
              setFilter("mine");
              setSubmitted(true);
            }, "Your thought is waiting for review.", setSubmitError);
            setBusy(false);
          }}
        >
          <label className="field-label" htmlFor="thought-topic">
            A little context
          </label>
          <select
            disabled={busy}
            id="thought-topic"
            className="input"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {[
              "Just sharing",
              "Small moments",
              "A little gratitude",
              "Looking for perspective",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <label className="field-label mt-5" htmlFor="thought-body">
            Your thought
          </label>
          <textarea
            disabled={busy}
            id="thought-body"
            className="input thought-textarea"
            rows={6}
            maxLength={3000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="You can start anywhere…"
          />
          <span className="character-count">
            {body.length.toLocaleString()}/3,000
          </span>
          <label className="checkbox-row">
            <input
              type="checkbox"
              disabled={busy}
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I understand this is a shared thought, not a private note. It will
              wait for review before other members can see it.
            </span>
          </label>
          <div className="inline-notice">
            <Clock3 size={16} />
            <p>
              Submissions are not monitored continuously. {policy?.reviewHours || "Review hours have not yet been confirmed."} For support now, open Get Help.
            </p>
          </div>
          <div className="modal-actions">
            <Button
              tone="ghost"
              disabled={busy}
              onClick={() => setCompose(false)}
              type="button"
            >
              Keep draft for later
            </Button>
            <Button type="submit" disabled={!policy?.communityCollectionOpen || !body.trim() || !confirmed || busy}>
              {busy ? "Submitting…" : "Submit for review"}
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      </Modal>
      <ReportConcernDialog target={reportTarget} onClose={()=>setReportTarget(null)}/>
    </>
  );
}
