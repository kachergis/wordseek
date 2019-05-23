#bdat = read.csv("pilot-data/bing-spring-break-data.csv", header=T)
#cdat = read.csv("pilot-data/CDMpilot-data.csv", header=T)
bdat = read.csv("wordseek_counterbalance_sheet-5-22-19.csv", header=T)
bdat$Subject = as.character(bdat$Subject)
bdat$FirstChoice = as.character(bdat$FirstChoice)

require(ggplot2)
require(rstan)
require(dplyr)
require(lme4)
require(brms)
require(langcog)
require(tidybayes)


# exclude subjects
bdat = subset(bdat, Exclude=="N")

# FirstBag = first one talked about (left/right)
# FirstBagLook = first one child looked into (left right)
bdat$FirstBagLook = as.character(bdat$FirstBagLook)
bdat$FirstBag = as.character(bdat$FirstBag)
table(bdat$FirstBag, bdat$FirstBagLook)
binom.test(table(bdat$FirstBagLook)) # sig. right bias..


bdat$ChoseLabeled = ifelse(bdat$FirstChoice=="label", 1, 0)

# need to code FirstToyRemove (left, right, together, null) in terms of FirstBag and FirstUtterance
bdat$LabeledLeftToy = with(bdat, ifelse(FirstBag=="left" & FirstUtterance=="label", 1, 0))
bdat$LabeledRightToy = with(bdat, ifelse(FirstBag=="right" & FirstUtterance=="label", 1, 0))
bdat$FirstRemoveLabeled = with(bdat, ifelse((LabeledLeftToy==1 & FirstToyRemove=="left") | (LabeledRightToy==1 & FirstToyRemove=="right"), 1, 0))

# proportion looking first in bag with labeled object
summary(glmer(ChoseLabeled ~ Age + Condition + (1|Subject), family=binomial, data=bdat))

table(bdat$ChoseLabeled, bdat$Condition) 
# overall, only in the interrupted condition was there a difference: more looked in the labeled bag first

summary(glmer(FirstRemoveLabeled ~ Age + Condition + (1|Subject), family=binomial, data=bdat))

table(bdat$FirstRemoveLabeled, bdat$Condition)
# in Huh, Interrupted, and Unknown conditions, more likely to first remove UNlabeled object


# floor/round Age in years for graphing
bdat$AgeYr = floor(bdat$Age) #round(bdat$Age)
bdag = bdat %>% group_by(Condition, AgeYr) %>%
  summarise(ChoseLabeled = mean(ChoseLabeled),
            FirstRemoveLabeled = mean(FirstRemoveLabeled))

#multi_boot_standard(bdag, "ChoseLabeled") # not working on AgeYr group

ggplot(data=bdag, aes(x=AgeYr, y=ChoseLabeled, group=Condition, color=Condition)) +
  geom_line() + geom_point() + ylab("Proportion First Looks at Labeled Object") + theme_bw() +
  xlab("Age in Years (rounded)") + ylim(0,1) + 
ggsave("prop_look_labeled_by_age.pdf", width=4, height=4)

ggplot(data=bdag, aes(x=AgeYr, y=FirstRemoveLabeled, group=Condition, color=Condition)) +
  geom_line() + geom_point() + ylab("Proportion First Removed Labeled Object") + theme_bw() +
  xlab("Age in Years (rounded)") + ylim(0,1) + 
  ggsave("prop_remove_labeled_by_age.pdf", width=4, height=4)


# try Bayesian regression
rstan_options(auto_write = TRUE)
options(mc.cores = parallel::detectCores())

# with/without age interaction?
bmLook <- brm(formula = ChoseLabeled ~ Age * Condition + (1 | Subject),
            data = bdat, family = bernoulli(),
            warmup = 1000, iter = 2000, chains = 4,
            control = list(adapt_delta = 0.95))
summary(bmLook)


plot(marginal_effects(bmLook), points = TRUE, rug = TRUE)

parameters <- bmLook %>% gather_draws(b_Age) %>% median_hdi()
print(exp(parameters[c(".value",".lower",".upper")])) # exp() converts log-odds to odds

parameters <- bmLook %>% gather_draws(b_ConditionInterrupted) %>% median_hdi()
print(exp(parameters[c(".value",".lower",".upper")])) 

parameters <- bmLook %>% gather_draws(b_ConditionUnknown) %>% median_hdi()
print(exp(parameters[c(".value",".lower",".upper")])) 


bmRemove <- brm(formula = FirstRemoveLabeled ~ Age * Condition + (1 | Subject),
          data = bdat, family = bernoulli(),
          warmup = 1000, iter = 2000, chains = 4,
          control = list(adapt_delta = 0.95))
summary(bmRemove)


plot(marginal_effects(bmLook), points = TRUE, rug = TRUE)

# should we set anything other than default prior?
# prior = c(set_prior("normal(0,5)", class = "b"), 
#  set_prior("cauchy(0,2)", class = "sd"),
#  set_prior("lkj(2)", class = "cor")),