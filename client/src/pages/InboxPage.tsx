import { useState, useEffect } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type InboxMessage } from "@shared/schema";
import { Mail, MailOpen, Star, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";

export function InboxPage() {
  const { inboxMessages, markMessageAsRead, loadGameData, refreshInbox, loading, initialized } = useFutsalManager();
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    if (initialized) {
      loadGameData();
    }
  }, [initialized]);

  const categories = ["all", "urgent", "match", "financial", "squad", "competition", "news"];

  const filteredMessages = filterCategory === "all"
    ? inboxMessages
    : inboxMessages.filter(m => m.category === filterCategory);

  const handleOpenMessage = async (message: InboxMessage) => {
    setSelectedMessage(message);
    if (!message.read) {
      await markMessageAsRead(message.id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500";
      case "medium": return "text-yellow-500";
      default: return "text-blue-500";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "urgent": return "🔴";
      case "match": return "📅";
      case "financial": return "💰";
      case "squad": return "👥";
      case "competition": return "🏆";
      case "news": return "📰";
      default: return "📧";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inbox</h1>
          <p className="text-muted-foreground">
            {inboxMessages.filter(m => !m.read).length} unread messages
          </p>
        </div>
        <Button onClick={refreshInbox} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(category => {
          const count = category === "all" 
            ? inboxMessages.length 
            : inboxMessages.filter(m => m.category === category).length;
          
          return (
            <Button
              key={category}
              variant={filterCategory === category ? "default" : "outline"}
              onClick={() => setFilterCategory(category)}
              size="sm"
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
              {count > 0 && <Badge className="ml-2" variant="secondary">{count}</Badge>}
            </Button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages in this category</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-center gap-4 p-4 hover:bg-muted cursor-pointer transition-colors ${
                    !message.read ? "bg-accent/10" : ""
                  }`}
                  onClick={() => handleOpenMessage(message)}
                >
                  <div className="text-2xl">{getCategoryIcon(message.category)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!message.read && (
                        <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                      )}
                      <h3 className={`text-sm font-medium truncate ${!message.read ? "font-bold" : ""}`}>
                        {message.subject}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{message.from}</span>
                      <span>•</span>
                      <span>{format(new Date(message.date), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {message.category}
                    </Badge>
                    {message.starred && (
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">
                  {selectedMessage?.subject}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{selectedMessage?.from}</span>
                  <span>•</span>
                  <span>
                    {selectedMessage && format(new Date(selectedMessage.date), "MMMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
              <Badge className={`${selectedMessage?.priority === "high" ? "bg-red-500" : ""}`}>
                {selectedMessage?.priority}
              </Badge>
            </div>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-foreground">
                  {selectedMessage.body}
                </div>
              </div>

              {selectedMessage.actionLink && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button>Take Action</Button>
                  <Button variant="outline">View Details</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
