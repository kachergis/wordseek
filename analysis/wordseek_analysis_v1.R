#bdat = read.csv("pilot-data/bing-spring-break-data.csv", header=T)
#cdat = read.csv("pilot-data/CDMpilot-data.csv", header=T)
bdat = read.csv("wordseek_counterbalance_sheet-5-22-19.csv", header=T)
bdat$Subject = as.character(bdat$Subject)
bdat$FirstChoice = as.character(bdat$FirstChoice)

require(dplyr)

table(bdat$Condition, bdat$FirstChoice)
table(bdat$FirstBag, bdat$FirstBagLook)

bdat = subset(bdat, Exclude=="N")

table(bdat$Condition, bdat$FirstChoice)

table(bdat$FirstBag, bdat$FirstBagLook)
binom.test(c(70, 98)) # sig. right bias..

require(lme4)
require(brms)
require(langcog)

bdat$ChoseLabeled = ifelse(bdat$FirstChoice=="label", 1, 0)

# FirstBag

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
# in Huh, Interrupted, and Unknown conditions, more likely to look first in UNlabeled

require(ggplot2)
bdat$AgeYr = floor(bdat$Age) #round(bdat$Age)
bdag = bdat %>% group_by(Condition, AgeYr) %>%
  summarise(ChoseLabeled = mean(ChoseLabeled),
            FirstRemoveLabeled = mean(FirstRemoveLabeled))

multi_boot_standard(bdag, "ChoseLabeled") # not working on AgeYr group

ggplot(data=bdag, aes(x=AgeYr, y=ChoseLabeled, group=Condition, color=Condition)) +
  geom_line() + geom_point() + ylab("Proportion First Looks at Labeled Object") + theme_bw() +
  xlab("Age in Years (rounded)") + ylim(0,1) + 
ggsave("prop_look_labeled_by_age.pdf", width=4, height=4)

ggplot(data=bdag, aes(x=AgeYr, y=FirstRemoveLabeled, group=Condition, color=Condition)) +
  geom_line() + geom_point() + ylab("Proportion First Removed Labeled Object") + theme_bw() +
  xlab("Age in Years (rounded)") + ylim(0,1) + 
  ggsave("prop_remove_labeled_by_age.pdf", width=4, height=4)

require(rstan)
rstan_options(auto_write = TRUE)
options(mc.cores = parallel::detectCores())

# (1 + Age|Subject)
bmLook <- brm(formula = ChoseLabeled ~ Age + Condition + (1 | Subject),
            data = bdat, family = bernoulli(),
            warmup = 1000, iter = 2000, chains = 4,
            control = list(adapt_delta = 0.95))
summary(bmLook)
# Population-Level Effects: 
#                     Estimate Est.Error l-95% CI u-95% CI Eff.Sample Rhat
#Intercept                0.02      1.23    -2.41     2.50       3935 1.00
#Age                     -0.04      0.27    -0.57     0.49       3917 1.00
#ConditionInterrupted     0.91      0.43     0.10     1.75       3744 1.00
#ConditionUnknown         0.15      0.41    -0.64     0.95       4187 1.00

bmRemove <- brm(formula = FirstRemoveLabeled ~ Age + Condition + (1 | Subject),
          data = bdat, family = bernoulli(),
          warmup = 1000, iter = 2000, chains = 4,
          control = list(adapt_delta = 0.95))
summary(bmRemove)
#Population-Level Effects: 
#                    Estimate Est.Error l-95% CI u-95% CI Eff.Sample Rhat
#Intercept               -0.22      1.19    -2.55     2.09       5361 1.00
#Age                     -0.25      0.26    -0.77     0.27       4985 1.00
#ConditionInterrupted     0.21      0.46    -0.71     1.09       5383 1.00
#ConditionUnknown         0.21      0.46    -0.67     1.14       5408 1.00

# prior = c(set_prior("normal(0,5)", class = "b"),
# set_prior("cauchy(0,2)", class = "sd"),
# set_prior("lkj(2)", class = "cor")),